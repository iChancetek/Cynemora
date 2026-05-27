"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import styles from "../dashboard.module.css";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: string;
  icon: string;
  desc: string;
  systemPrompt?: string;
}

export default function AgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [instructionOverride, setInstructionOverride] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setInstructionOverride(agent.systemPrompt || `You are the ${agent.name}. Your role is ${agent.role}. ${agent.desc}`);
  };

  const handleSaveConfig = async () => {
    if (!selectedAgent || !user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "agents", selectedAgent.id), {
        systemPrompt: instructionOverride
      });
      setSelectedAgent(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const initializeCoreAgents = async () => {
    if (!user) return;
    setIsInitializing(true);
    try {
      const coreAgents = [
        { name: "Story Architect", role: "Narrative & Act Structure", status: "Active", icon: "🧠", desc: "Breaks complex narratives into distinct thematic acts and scenes." },
        { name: "Scene Decomposer", role: "Environment & Motif Extraction", status: "Active", icon: "👁️", desc: "Analyzes environments to extract lighting, mood, and visual motifs." },
        { name: "Shot Planner", role: "CyneMora 3.5 Render Compilation", status: "Active", icon: "🎬", desc: "Compiles complex scene instructions into exact CyneMora 3.5 rendering constraints." },
        { name: "Continuity Supervisor", role: "Visual DNA Mapping", status: "Training", icon: "🧬", desc: "Ensures character and environmental persistence across sequential shots." }
      ];

      for (const agent of coreAgents) {
        await addDoc(collection(db, "agents"), {
          userId: user.uid,
          ...agent,
          createdAt: new Date()
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "agents"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Agent[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Agent));
      setAgents(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching agents", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: 'var(--space-8)' }}>Loading cinematic agents...</div>;
  }

  return (
    <div className="animate-fade-in">
      <header className={styles.dashHeader}>
        <h1 className={styles.dashGreeting}>AI Agents</h1>
        <p className={styles.dashSubtitle}>Configure and train your specialized cinematic production agents.</p>
      </header>

      {selectedAgent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: 'var(--space-8)', position: 'relative', border: '1px solid var(--color-border-active)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <button onClick={() => setSelectedAgent(null)} style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-6)', background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: '1.5rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'white'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}>×</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div className={styles.actionIcon} style={{ width: '64px', height: '64px', fontSize: '2rem' }}>{selectedAgent.icon}</div>
              <div>
                <h2 style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>{selectedAgent.name}</h2>
                <p style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{selectedAgent.role}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>System Instruction Override</label>
                <textarea 
                  value={instructionOverride}
                  onChange={(e) => setInstructionOverride(e.target.value)}
                  style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)', minHeight: '120px', resize: 'vertical', fontSize: 'var(--text-sm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>Creativity vs Precision (Temperature)</label>
                <input type="range" min="0" max="100" defaultValue="70" style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                  <span>Absolute Precision (0.0)</span>
                  <span>High Creativity (1.0)</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Agent Configuration"}
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSelectedAgent(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {agents.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🤖</div>
          <h3 className={styles.emptyTitle}>No Agents Configured</h3>
          <p className={styles.emptyDesc}>Initialize your first cinematic agent to start production.</p>
          <button className="btn btn-primary" onClick={initializeCoreAgents} disabled={isInitializing}>
            {isInitializing ? "Initializing Agents..." : "Initialize Core Studio Agents"}
          </button>
        </div>
      ) : (
        <div className={styles.quickActionsGrid}>
          {agents.map((agent) => (
            <div key={agent.id} className="glass-card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className={styles.actionIcon}>{agent.icon || "🤖"}</div>
                <span className={`badge ${agent.status === 'Active' ? 'badge-primary' : agent.status === 'Training' ? 'badge-accent' : 'badge-warm'}`}>
                  {agent.status}
                </span>
              </div>
              <div>
                <h3 className={styles.actionTitle}>{agent.name}</h3>
                <p className={styles.statLabel} style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary-light)' }}>{agent.role}</p>
                <p className={styles.actionDesc}>{agent.desc}</p>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: 'auto', width: '100%' }}
                onClick={() => handleEditAgent(agent)}
              >
                {agent.status === 'Training' ? 'Train Agent' : 'Configure Parameters'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
