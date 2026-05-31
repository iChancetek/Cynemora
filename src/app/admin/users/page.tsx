/* ========================================
   CyneMora — Admin User Management Center
   Prevents abuse, controls access, resets limits
   ======================================== */

"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";

interface UserRender {
  id: string;
  title?: string;
  prompt?: string;
  status: "completed" | "rendering" | "failed" | "pending";
  provider: string;
  videoUrl?: string;
  createdAt: string;
  duration?: number;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
  creationTime: string;
  lastSignInTime: string | null;
  role: "admin" | "trial";
  videoCount: number;
  totalDuration: number;
  lastIp: string;
  lastUsed: string;
  allIps: string[];
  renders?: UserRender[];
}

export default function UserManagementCenter() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState<"all" | "true" | "false">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected user for Detail Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [playbackVideo, setPlaybackVideo] = useState<UserRender | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Fetch user directory
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/users", window.location.origin);
      if (search) url.searchParams.set("q", search);
      if (filterVerified !== "all") url.searchParams.set("verified", filterVerified);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load user directory");
      const json = await res.json();
      if (json.success) {
        setUsers(json.users);
      } else {
        throw new Error(json.error || "Unknown user list error");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterVerified]); // Refresh when filter updates

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchUsers();
    }
  };

  // Perform admin user actions
  const handleUserAction = async (action: "toggle-verify" | "toggle-disable" | "reset-trial" | "delete") => {
    if (!selectedUser) return;
    
    // Safety confirmation for deletion and reset
    if (action === "delete" && !confirm(`Are you absolutely sure you want to permanently delete the user ${selectedUser.displayName} (${selectedUser.email})? This action will purge all their assets and history.`)) {
      return;
    }
    if (action === "reset-trial" && !confirm(`Reset video trial counts for ${selectedUser.displayName}? They will get a fresh set of trial generation slots.`)) {
      return;
    }

    try {
      setActionLoading(true);
      
      if (action === "delete") {
        const res = await fetch(`/api/admin/users/${selectedUser.uid}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete user account.");
        const json = await res.json();
        if (json.success) {
          alert("Account and related assets successfully purged.");
          setSelectedUser(null);
          fetchUsers();
        } else {
          throw new Error(json.error || "Failed deletion");
        }
      } else {
        // PATCH actions (toggle-verify, toggle-disable, reset-trial)
        const res = await fetch(`/api/admin/users/${selectedUser.uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            value: action === "toggle-verify" ? !selectedUser.emailVerified : 
                   action === "toggle-disable" ? !selectedUser.disabled : undefined
          }),
        });
        if (!res.ok) throw new Error("Action failed to execute.");
        const json = await res.json();
        if (json.success) {
          alert(json.message);
          
          // Update selected user local view
          const updatedUser = { ...selectedUser };
          if (action === "toggle-verify") updatedUser.emailVerified = !selectedUser.emailVerified;
          if (action === "toggle-disable") updatedUser.disabled = !selectedUser.disabled;
          if (action === "reset-trial") {
            updatedUser.videoCount = 0;
            updatedUser.totalDuration = 0;
          }
          setSelectedUser(updatedUser);
          fetchUsers();
        } else {
          throw new Error(json.error || "Action failed");
        }
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Set new account password
  const handlePasswordChange = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      alert("Error: Password must be at least 6 characters in length.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/users/${selectedUser.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-password",
          password: newPassword
        }),
      });

      if (!res.ok) throw new Error("Failed to update user's password.");
      const json = await res.json();
      if (json.success) {
        alert("Password updated successfully.");
        setNewPassword("");
      } else {
        throw new Error(json.error || "Password change failed.");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>User Operations Command</h1>
          <p className={styles.pageSubtitle}>Monitor user actions, detect multi-IP trial abusers, verify accounts, and reset execution limits.</p>
        </div>
      </header>

      {/* Directory Filters Bar */}
      <section style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {/* Search */}
        <div className={styles.searchWrap} style={{ flex: 1, minWidth: "260px" }}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchBar}
            placeholder="Search email, name, UID, or IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            style={{ maxWidth: "100%" }}
          />
        </div>
        <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading} style={{ height: "40px" }}>
          Search
        </button>

        {/* Verification Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>VERIFIED STATUS:</span>
          <select
            value={filterVerified}
            onChange={(e) => setFilterVerified(e.target.value as any)}
            style={{
              padding: "8px 12px",
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="all">Show All Accounts</option>
            <option value="true">Email Verified Only</option>
            <option value="false">Unverified Accounts</option>
          </select>
        </div>
      </section>

      {/* User Directory Table */}
      {loading && users.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "30vh", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ width: "24px", height: "24px", border: "2px solid var(--color-primary-light)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ padding: "var(--space-6)", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-lg)", color: "var(--color-error)" }}>
          <p>{error}</p>
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-10)", background: "var(--color-bg-glass)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          <span style={{ fontSize: "32px", display: "block", marginBottom: "var(--space-2)" }}>👥</span>
          <h4 style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>No Accounts Found</h4>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "4px" }}>No platform directors matched the specified queries.</p>
        </div>
      ) : (
        <div style={{ background: "var(--color-bg-glass)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Director Profile</th>
                <th>Access Role</th>
                <th>Joined Date</th>
                <th>Generates</th>
                <th>Duration</th>
                <th>Last Active IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isVerified = u.emailVerified;
                const isBlocked = u.disabled;
                
                let badgeClass = styles.statusPending;
                let badgeLabel = "Pending";
                if (isBlocked) {
                  badgeClass = styles.statusOffline;
                  badgeLabel = "Blocked";
                } else if (isVerified) {
                  badgeClass = styles.statusOnline;
                  badgeLabel = "Verified";
                }

                return (
                  <tr key={u.uid} onClick={() => setSelectedUser(u)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className={styles.adminUserAvatar} style={{ width: "36px", height: "36px" }}>
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName} referrerPolicy="no-referrer" />
                          ) : (
                            u.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{u.displayName}</div>
                          <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${u.role === "admin" ? styles.statusAdmin : styles.statusTrial}`}>
                        {u.role === "admin" ? "Admin" : "Trial User"}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                      {new Date(u.creationTime).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.videoCount}</td>
                    <td style={{ color: "var(--color-primary-light)" }}>{u.totalDuration}s</td>
                    <td style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: u.allIps.length > 1 ? "var(--color-accent-light)" : "var(--color-text-secondary)" }}>
                      {u.lastIp} {u.allIps.length > 1 && `(${u.allIps.length} IPs)`}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details & Governance Modal */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ borderTop: `4px solid ${selectedUser.role === "admin" ? "#fbbf24" : "var(--color-primary)"}` }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Director Governance Card</h3>
              <button className={styles.modalClose} onClick={() => setSelectedUser(null)}>
                &times;
              </button>
            </div>

            {/* Profile Overview */}
            <div className={styles.modalSection} style={{ display: "flex", gap: "16px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "var(--space-4)" }}>
              <div className={styles.adminUserAvatar} style={{ width: "52px", height: "52px", fontSize: "18px" }}>
                {selectedUser.photoURL ? (
                  <img src={selectedUser.photoURL} alt={selectedUser.displayName} referrerPolicy="no-referrer" />
                ) : (
                  selectedUser.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h4 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>{selectedUser.displayName}</h4>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>UID: {selectedUser.uid}</p>
              </div>
            </div>

            {/* Platform Metrics */}
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>Operational Usage</h4>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Total Generated Clips</span>
                <span className={styles.modalFieldValue} style={{ fontWeight: 700 }}>{selectedUser.videoCount}</span>
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Airtime Duration</span>
                <span className={styles.modalFieldValue} style={{ color: "var(--color-primary-light)" }}>{selectedUser.totalDuration} seconds</span>
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Last Generative Trigger</span>
                <span className={styles.modalFieldValue}>
                  {selectedUser.lastUsed !== "Never" ? `${new Date(selectedUser.lastUsed).toLocaleDateString()} ${new Date(selectedUser.lastUsed).toLocaleTimeString()}` : "Never"}
                </span>
              </div>
            </div>

            {/* System Info */}
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>Account Credentials & Security</h4>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Auth Email Address</span>
                <span className={styles.modalFieldValue}>{selectedUser.email}</span>
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Email Verification Status</span>
                <span className={styles.modalFieldValue}>
                  <span className={`${styles.statusBadge} ${selectedUser.emailVerified ? styles.statusOnline : styles.statusPending}`}>
                    {selectedUser.emailVerified ? "Verified" : "Unverified Status"}
                  </span>
                </span>
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Account Governance Flag</span>
                <span className={styles.modalFieldValue}>
                  <span className={`${styles.statusBadge} ${selectedUser.disabled ? styles.statusOffline : styles.statusOnline}`}>
                    {selectedUser.disabled ? "Blocked Account" : "Access Active"}
                  </span>
                </span>
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Date Registered</span>
                <span className={styles.modalFieldValue}>{new Date(selectedUser.creationTime).toLocaleString()}</span>
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Last Sign-in Activity</span>
                <span className={styles.modalFieldValue}>
                  {selectedUser.lastSignInTime ? new Date(selectedUser.lastSignInTime).toLocaleString() : "N/A"}
                </span>
              </div>
            </div>

            {/* Abuse Monitoring / IP Logs */}
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Associated IP Addresses</span>
                {selectedUser.allIps.length > 1 && <span style={{ color: "var(--color-error)", fontSize: "10px" }}>🚨 MULTIPLE IPS DETECTED (POTENTIAL TRIAL ABUSE)</span>}
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "var(--space-2)" }}>
                {selectedUser.allIps.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>No operational IP logs captured.</span>
                ) : (
                  selectedUser.allIps.map((ip) => (
                    <span key={ip} style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "3px 8px", background: "var(--color-surface-2)", borderRadius: "4px", border: "1px solid var(--color-border)" }}>
                      {ip}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* User Video Generations */}
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>Generated Videos ({selectedUser.renders?.length || 0})</h4>
              {(!selectedUser.renders || selectedUser.renders.length === 0) ? (
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>No videos generated by this user account yet.</p>
              ) : (
                <div style={{ maxHeight: "200px", overflowY: "auto", background: "var(--color-surface-2)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", padding: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {selectedUser.renders.map((render) => {
                    const status = render.status;
                    let badgeClass = styles.statusPending;
                    if (status === "completed") badgeClass = styles.statusOnline;
                    if (status === "failed") badgeClass = styles.statusOffline;

                    return (
                      <div key={render.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", gap: "12px", background: "rgba(255,255,255,0.01)", borderRadius: "var(--radius-md)" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {render.title || "Untitled Video"}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            "{render.prompt || "No prompt registered"}"
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={`${styles.statusBadge} ${badgeClass}`} style={{ fontSize: "9px" }}>
                            {status === "completed" ? "Success" : status === "failed" ? "Failed" : "Rendering"}
                          </span>
                          {status === "completed" && render.videoUrl ? (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => setPlaybackVideo(render)}
                              style={{ padding: "2px 6px", fontSize: "10px" }}
                            >
                              Play
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-secondary" disabled style={{ padding: "2px 6px", fontSize: "10px", opacity: 0.3 }}>
                              Play
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Password Management */}
            <div className={styles.modalSection} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "var(--space-4)" }}>
              <h4 className={styles.modalSectionTitle}>Password Governance</h4>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginTop: "var(--space-2)", width: "100%" }}>
                <input
                  type="password"
                  placeholder="Enter new account password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={actionLoading || selectedUser.role === "admin"}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "var(--color-surface-1)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--text-sm)",
                    outline: "none"
                  }}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handlePasswordChange}
                  disabled={actionLoading || selectedUser.role === "admin" || !newPassword}
                  style={{ height: "36px", padding: "0 var(--space-4)", fontSize: "11px", whiteSpace: "nowrap" }}
                >
                  Set New Password
                </button>
              </div>
            </div>

            {/* Governance Actions Panel */}
            <div className={styles.modalSection} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "var(--space-4)" }}>
              <h4 className={styles.modalSectionTitle}>Security & Account Governance Controls</h4>
              <div className={styles.actionRow}>
                {/* Verify / Unverify */}
                <button
                  className={styles.actionBtn}
                  onClick={() => handleUserAction("toggle-verify")}
                  disabled={actionLoading || selectedUser.role === "admin"}
                >
                  {selectedUser.emailVerified ? "⚠️ Revoke Email Verification" : "✅ Force Verify Email"}
                </button>

                {/* Block / Unblock */}
                <button
                  className={styles.actionBtn}
                  onClick={() => handleUserAction("toggle-disable")}
                  disabled={actionLoading || selectedUser.role === "admin"}
                  style={{ color: selectedUser.disabled ? "var(--color-success)" : "var(--color-error)" }}
                >
                  {selectedUser.disabled ? "🔓 Reinstate User Access" : "🚫 Terminate User Access"}
                </button>

                {/* Reset trial limits */}
                <button
                  className={styles.actionBtn}
                  onClick={() => handleUserAction("reset-trial")}
                  disabled={actionLoading || selectedUser.role === "admin"}
                >
                  🔄 Reset Trial Counters
                </button>

                {/* Permanent purge */}
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => handleUserAction("delete")}
                  disabled={actionLoading || selectedUser.role === "admin"}
                  style={{ marginLeft: "auto" }}
                >
                  ☠️ Permanent Purge Account
                </button>
              </div>
              {selectedUser.role === "admin" && (
                <p style={{ fontSize: "11px", color: "#fbbf24", marginTop: "var(--space-3)", fontWeight: 500 }}>
                  🛡️ Administrator Account: Safety bypass is active. Admins cannot be blocked, unverified, reset, or purged from this terminal.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Video Audit Playback Modal */}
      {playbackVideo && playbackVideo.videoUrl && (
        <div className={styles.modalOverlay} onClick={() => setPlaybackVideo(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", borderTop: "4px solid var(--color-primary-light)", zIndex: 9999 }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ display: "flex", flexDirection: "column" }}>
                <span>{playbackVideo.title || "User Video Playback"}</span>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 400, marginTop: "2px" }}>
                  Director: {selectedUser?.displayName} ({selectedUser?.email})
                </span>
              </h3>
              <button className={styles.modalClose} onClick={() => setPlaybackVideo(null)}>
                &times;
              </button>
            </div>

            {/* Video Player */}
            <div className={styles.modalSection} style={{ background: "#000", borderRadius: "var(--radius-lg)", overflow: "hidden", display: "flex", justifyContent: "center", border: "1px solid var(--color-border)", minHeight: "260px" }}>
              <video
                src={playbackVideo.videoUrl}
                controls
                autoPlay
                style={{ width: "100%", maxHeight: "400px", objectFit: "contain" }}
              />
            </div>

            {/* Info details */}
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>Operational Metadata</h4>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Generative Prompt</span>
                <span className={styles.modalFieldValue} style={{ fontStyle: "italic", textAlign: "left", maxWidth: "80%", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  "{playbackVideo.prompt}"
                </span>
              </div>
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Render Node ID</span>
                <span className={styles.modalFieldValue} style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{playbackVideo.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
