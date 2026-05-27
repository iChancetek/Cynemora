"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { collectionGroup, query, where, onSnapshot, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { VisualDNA } from "@/lib/types";
import styles from "../dashboard.module.css";

export default function VisualDnaPage() {
  const { user } = useAuth();
  const [elements, setElements] = useState<VisualDNA[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName || !newPrompt || !user) return;
    setIsSubmitting(true);
    try {
      let imageUrl = "";
      if (newImage) {
        const storageRef = ref(storage, `visualDna/${user.uid}/${Date.now()}_${newImage.name}`);
        await uploadBytes(storageRef, newImage);
        imageUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "visualDna"), {
        userId: user.uid,
        characterName: newName,
        appearance: { distinguishingFeatures: [newPrompt] },
        referenceImages: imageUrl ? [imageUrl] : [],
        createdAt: new Date()
      });
      setIsCreating(false);
      setNewName("");
      setNewPrompt("");
      setNewImage(null);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collectionGroup(db, "visualDna"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: VisualDNA[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as VisualDNA));
      setElements(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching visual DNA", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: 'var(--space-8)' }}>Loading Visual DNA vault...</div>;
  }

  return (
    <div className="animate-fade-in">
      <header className={styles.dashHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className={styles.dashGreeting}>Visual DNA</h1>
          <p className={styles.dashSubtitle}>Define and maintain persistent characters, styles, and core assets.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "Cancel" : "+ Add New DNA"}
        </button>
      </header>

      {isCreating && (
        <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>Create New Character DNA</h2>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Character Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Cyberpunk Detective" style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Visual Prompt (Appearance details)</label>
              <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="e.g. A tall figure in a glowing trenchcoat, neon blue eyes, rain-slicked hair..." style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)', minHeight: '80px', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Reference Image (Crucial for CyneMora 3.5 Image-to-Video)</label>
              <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files?.[0] || null)} style={{ width: '100%', padding: 'var(--space-3)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)' }} />
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={!newName || !newPrompt || isSubmitting} style={{ justifySelf: 'flex-start', marginTop: 'var(--space-2)' }}>
              {isSubmitting ? "Synthesizing DNA..." : "🧬 Synthesize DNA"}
            </button>
          </div>
        </div>
      )}

      {elements.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🧬</div>
          <h3 className={styles.emptyTitle}>No Visual DNA Found</h3>
          <p className={styles.emptyDesc}>Start building persistent character profiles and style guides.</p>
        </div>
      ) : (
        <div className={styles.quickActionsGrid}>
          {elements.map((el) => (
            <div key={el.id} className="glass-card" style={{ padding: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.03, transform: 'rotate(15deg)', pointerEvents: 'none' }}>🧬</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', position: 'relative' }}>
                <span className="badge badge-accent">Character</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-success)' }}>
                  ● Ready
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', position: 'relative' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid var(--color-border)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                  {el.referenceImages && el.referenceImages.length > 0 ? (
                     <img src={el.referenceImages[0]} alt={el.characterName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : '👤'}
                </div>
                <div>
                  <h3 className={styles.actionTitle} style={{ marginBottom: 0 }}>{el.characterName}</h3>
                  <p className={styles.statLabel} style={{ fontFamily: 'var(--font-mono)' }}>ID: {el.id.slice(0, 8)}</p>
                </div>
              </div>
              <p className={styles.actionDesc} style={{ marginBottom: 'var(--space-6)', position: 'relative', minHeight: '40px' }}>
                {el.appearance?.distinguishingFeatures?.[0] || 'A persistent character model.'}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', position: 'relative' }}>
                <button className="btn btn-sm btn-secondary" style={{ flex: 1 }}>Edit Properties</button>
                <button className="btn btn-sm btn-ghost" style={{ padding: 'var(--space-2)' }}>⋮</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
