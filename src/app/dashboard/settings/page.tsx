"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import styles from "../dashboard.module.css";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  
  // States for Settings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Profile Data
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // API Data
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [runwayKey, setRunwayKey] = useState("");

  // Render Defaults
  const [defaultProvider, setDefaultProvider] = useState("gemini");
  const [defaultResolution, setDefaultResolution] = useState("1080p");
  const [defaultFps, setDefaultFps] = useState("24");

  // Notifications
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [renderCompleteAlerts, setRenderCompleteAlerts] = useState(true);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setDisplayName(user.displayName || "");
    
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "userSettings", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setBio(data.bio || "");
          setOpenaiKey(data.openaiKey || "");
          setGeminiKey(data.geminiKey || "");
          setRunwayKey(data.runwayKey || "");
          setDefaultProvider(data.defaultProvider || "gemini");
          setDefaultResolution(data.defaultResolution || "1080p");
          setDefaultFps(data.defaultFps || "24");
          setEmailAlerts(data.emailAlerts ?? true);
          setRenderCompleteAlerts(data.renderCompleteAlerts ?? true);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      if (activeTab === "profile" && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      if (activeTab === "security") {
        if (newPassword && newPassword === confirmPassword) {
          await updatePassword(user, newPassword);
          setNewPassword("");
          setConfirmPassword("");
        } else if (newPassword) {
          throw new Error("Passwords do not match.");
        }
      }

      // Save to Firestore
      const docRef = doc(db, "userSettings", user.uid);
      await setDoc(docRef, {
        bio,
        openaiKey,
        geminiKey,
        runwayKey,
        defaultProvider,
        defaultResolution,
        defaultFps,
        emailAlerts,
        renderCompleteAlerts,
      }, { merge: true });

      setSuccessMsg("Settings saved successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings.");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: 'var(--space-8)' }}>Loading settings...</div>;
  }

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "C";

  return (
    <div className="animate-fade-in">
      <header className={styles.dashHeader}>
        <h1 className={styles.dashGreeting}>Settings</h1>
        <p className={styles.dashSubtitle}>Manage your account preferences and production environment.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 3fr', gap: 'var(--space-8)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', position: 'sticky', top: '100px' }}>
          {[
            { id: 'profile', label: 'Profile Settings' },
            { id: 'api', label: 'API & Integrations' },
            { id: 'render', label: 'Render Defaults' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'security', label: 'Security' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSuccessMsg(""); setErrorMsg(""); }}
              className={`btn ${activeTab === tab.id ? 'btn-secondary' : 'btn-ghost'}`} 
              style={{ 
                justifyContent: 'flex-start', 
                background: activeTab === tab.id ? 'var(--color-surface-2)' : 'transparent',
                borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-primary-light)' : 'var(--color-text-secondary)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 'var(--space-8)', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {activeTab === 'profile' && (
              <div className="animate-fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Profile Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'var(--color-text-primary)', fontWeight: 700, boxShadow: '0 0 20px var(--color-primary-glow)' }}>
                      {user?.photoURL ? <img src={user.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : userInitial}
                    </div>
                    <div>
                      <button className="btn btn-secondary btn-sm" style={{ marginBottom: 'var(--space-2)' }}>Upload Avatar</button>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Display Name</label>
                    <input type="text" className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Director Name" />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Email Address (Read Only)</label>
                    <input type="email" className="input" value={user?.email || ""} readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Bio</label>
                    <textarea className="input" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Visionary AI cinematic director." style={{ resize: 'vertical' }}></textarea>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="animate-fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>API & Integrations</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>Bring your own keys to bypass CyneMora standard credits and use raw API access.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>OpenAI API Key (GPT-5 / Whisper)</label>
                    <input type="password" className="input" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-proj-..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>CyneMora Rendering API Key</label>
                    <input type="password" className="input" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Runway API Key (Gen-3 Alpha)</label>
                    <input type="password" className="input" value={runwayKey} onChange={e => setRunwayKey(e.target.value)} placeholder="key_..." />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'render' && (
              <div className="animate-fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Render Defaults</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Default AI Provider</label>
                    <select className="input" value={defaultProvider} onChange={e => setDefaultProvider(e.target.value)}>
                      <option value="gemini">CyneMora 3.5 (Cinematic Default)</option>
                      <option value="openai">OpenAI Sora</option>
                      <option value="runway">Runway Gen-3</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Resolution</label>
                      <select className="input" value={defaultResolution} onChange={e => setDefaultResolution(e.target.value)}>
                        <option value="1080p">1080p HD</option>
                        <option value="4k">4K UHD</option>
                        <option value="8k">8K Cinematic</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Frame Rate</label>
                      <select className="input" value={defaultFps} onChange={e => setDefaultFps(e.target.value)}>
                        <option value="24">24 FPS (Cinematic)</option>
                        <option value="30">30 FPS (Standard)</option>
                        <option value="60">60 FPS (Smooth)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="animate-fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Notifications</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer', padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                    <div>
                      <span style={{ display: 'block', fontWeight: 500, color: 'var(--color-text-primary)' }}>Marketing & Updates</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Receive emails about new models and features.</span>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer', padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <input type="checkbox" checked={renderCompleteAlerts} onChange={e => setRenderCompleteAlerts(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                    <div>
                      <span style={{ display: 'block', fontWeight: 500, color: 'var(--color-text-primary)' }}>Render Completion</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Get notified when your long-running renders are finished.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="animate-fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Security</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>New Password</label>
                    <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Confirm New Password</label>
                    <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-6)', marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-4)' }}>
            {successMsg && <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>{successMsg}</span>}
            {errorMsg && <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>{errorMsg}</span>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
