/* ========================================
   CyneMora — Admin Video Archive & Queue
   Lists all user renders with on-demand video playback
   ======================================== */

"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";

interface RenderJob {
  id: string;
  title?: string;
  prompt?: string;
  status: "completed" | "rendering" | "failed" | "pending";
  provider: string;
  videoUrl?: string;
  createdAt: string;
  creatorEmail: string;
  creatorName: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
}

export default function VideoArchiveCenter() {
  const [renders, setRenders] = useState<RenderJob[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback Modal state
  const [playbackVideo, setPlaybackVideo] = useState<RenderJob | null>(null);

  const fetchRenders = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/renders", window.location.origin);
      if (search) url.searchParams.set("q", search);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (providerFilter !== "all") url.searchParams.set("provider", providerFilter);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to retrieve platform video archive.");
      const json = await res.json();
      
      if (json.success) {
        setRenders(json.renders);
      } else {
        throw new Error(json.error || "Unknown render queue error");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenders();
  }, [statusFilter, providerFilter]); // Auto-refresh when filters change

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchRenders();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Video Archive & Renders</h1>
          <p className={styles.pageSubtitle}>Keep track of all videos created by user accounts. Play back generated clips, audit prompts, and monitor render states.</p>
        </div>
      </header>

      {/* Database Filters Bar */}
      <section style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {/* Search */}
        <div className={styles.searchWrap} style={{ flex: 1, minWidth: "260px" }}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchBar}
            placeholder="Search prompt, director, title, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            style={{ maxWidth: "100%" }}
          />
        </div>
        <button className="btn btn-secondary" onClick={fetchRenders} disabled={loading} style={{ height: "40px" }}>
          Search
        </button>

        {/* Status select */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>STATUS:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="all">All States</option>
            <option value="completed">Completed Only</option>
            <option value="rendering">Active Rendering</option>
            <option value="failed">Failed Renders</option>
            <option value="pending">Pending Queue</option>
          </select>
        </div>

        {/* Model/Provider select */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>PROVIDER:</span>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
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
            <option value="all">All Providers</option>
            <option value="google-cloud">Google Vertex AI</option>
            <option value="mock-cinematic-provider">Mock Simulation</option>
          </select>
        </div>
      </section>

      {/* Renders Queue List */}
      {loading && renders.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "30vh", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ width: "24px", height: "24px", border: "2px solid var(--color-primary-light)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ padding: "var(--space-6)", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-lg)", color: "var(--color-error)" }}>
          <p>{error}</p>
        </div>
      ) : renders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-10)", background: "var(--color-bg-glass)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)" }}>
          <span style={{ fontSize: "32px", display: "block", marginBottom: "var(--space-2)" }}>🎞️</span>
          <h4 style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>No Video Renders Found</h4>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "4px" }}>No render jobs matched the query parameters.</p>
        </div>
      ) : (
        <div style={{ background: "var(--color-bg-glass)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <table className={styles.dataTable} style={{ cursor: "default" }}>
            <thead>
              <tr>
                <th>Video Information</th>
                <th>Director (Account)</th>
                <th>AI Model</th>
                <th>Duration / Frame</th>
                <th>Timestamp</th>
                <th>Render Status</th>
                <th style={{ textAlign: "right" }}>Operation</th>
              </tr>
            </thead>
            <tbody>
              {renders.map((r) => {
                const status = r.status;
                let badgeClass = styles.statusPending;
                if (status === "completed") badgeClass = styles.statusOnline;
                if (status === "failed") badgeClass = styles.statusOffline;
                if (status === "rendering") badgeClass = styles.statusPending;

                return (
                  <tr key={r.id} style={{ cursor: "default" }}>
                    <td style={{ maxWidth: "300px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.title || "Cinematic Clip"}>
                          {r.title || "Untitled Generation"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineBreak: "anywhere", lineHeight: "1.4" }} title={r.prompt}>
                          "{r.prompt || "No prompt registered."}"
                        </div>
                        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--color-text-tertiary)", marginTop: "3px" }}>
                          ID: {r.id}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--color-text-secondary)" }}>{r.creatorName}</span>
                        <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>{r.creatorEmail}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{ textTransform: "uppercase", fontSize: "9px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                        {r.provider === "mock-cinematic-provider" ? "Veo Lite (Simulation)" : "Veo 3.1 Pro"}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--color-primary-light)" }}>
                      {r.duration || 8}s • {r.aspectRatio || "16:9"}
                    </td>
                    <td style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${badgeClass}`}>
                        {status === "completed" ? "Success" : status === "rendering" ? "Rendering" : status === "failed" ? "Failed" : "Queued"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {status === "completed" && r.videoUrl ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setPlaybackVideo(r)}
                          style={{ padding: "4px 10px", fontSize: "11px" }}
                        >
                          👁️ Playback Video
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-secondary" disabled style={{ opacity: 0.3, padding: "4px 10px", fontSize: "11px" }}>
                          Unavailable
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Video Audit Playback Modal */}
      {playbackVideo && playbackVideo.videoUrl && (
        <div className={styles.modalOverlay} onClick={() => setPlaybackVideo(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", borderTop: "4px solid var(--color-primary-light)" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ display: "flex", flexDirection: "column" }}>
                <span>{playbackVideo.title || "Operational Video Playback"}</span>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 400, marginTop: "2px" }}>
                  Director: {playbackVideo.creatorName} ({playbackVideo.creatorEmail})
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
              <div className={styles.modalField}>
                <span className={styles.modalFieldLabel}>Storage Video URL</span>
                <span className={styles.modalFieldValue} style={{ fontSize: "11px" }}>
                  <a href={playbackVideo.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent-light)" }}>
                    Download Source File
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
