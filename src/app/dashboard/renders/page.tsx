"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { db } from "@/lib/firebase/client";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { RenderJob } from "@/lib/types";
import styles from "../dashboard.module.css";

export default function RendersPage() {
  const { user } = useAuth();
  const [renders, setRenders] = useState<RenderJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "renders"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RenderJob[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({ 
          id: doc.id, 
          ...docData,
          createdAt: docData.createdAt?.toDate(),
          startedAt: docData.startedAt?.toDate(),
          completedAt: docData.completedAt?.toDate()
        } as RenderJob);
      });
      setRenders(data.sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching renders", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: 'var(--space-8)' }}>Loading render queue...</div>;
  }

  return (
    <div className="animate-fade-in">
      <header className={styles.dashHeader}>
        <h1 className={styles.dashGreeting}>Render Queue</h1>
        <p className={styles.dashSubtitle}>Monitor and manage your high-fidelity video generation tasks.</p>
      </header>

      {renders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎥</div>
          <h3 className={styles.emptyTitle}>No Active Renders</h3>
          <p className={styles.emptyDesc}>Your render queue is currently empty. Start a new generation from a project.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {renders.map((render) => (
              <div key={render.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', minWidth: '250px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    {render.status === 'completed' ? '✅' : render.status === 'rendering' ? '⏳' : render.status === 'failed' ? '❌' : '⏱️'}
                  </div>
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {render.title ? render.title : render.prompt ? (render.prompt.length > 30 ? render.prompt.substring(0, 30) + '...' : render.prompt) : 'Cinematic Render'}
                    </h4>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                      <span>{render.id?.substring(0, 8)}...</span> • <span style={{ color: 'var(--color-accent-light)' }}>{render.provider || "CyneMora 3.5"}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ flex: '1', minWidth: '200px', margin: '0 var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500, textTransform: 'capitalize' }}>{render.status}</span>
                    <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{render.status === 'completed' ? '100%' : render.status === 'failed' ? '0%' : 'Processing...'}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--color-surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: render.status === 'completed' ? '100%' : render.status === 'failed' ? '100%' : '50%', background: render.status === 'failed' ? 'var(--color-error)' : render.status === 'completed' ? 'var(--color-success)' : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))', transition: 'width 1s ease-in-out', boxShadow: render.status === 'rendering' ? '0 0 10px var(--color-primary-glow)' : 'none', animation: render.status === 'rendering' ? 'pulse-glow 2s infinite' : 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', minWidth: '150px', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{render.createdAt?.toLocaleDateString()}</span>
                  {render.status === 'completed' && render.videoUrl ? (
                    <a href={render.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">Download</a>
                  ) : render.status === 'failed' ? (
                    <button className="btn btn-sm btn-secondary">Retry</button>
                  ) : render.status === 'rendering' ? (
                    <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-error)' }}>Cancel</button>
                  ) : (
                    <button className="btn btn-sm btn-secondary" disabled>Waiting...</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
