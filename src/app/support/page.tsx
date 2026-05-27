import React from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function SupportPage() {
  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/icon-192x192.png" alt="CyneMora Logo" width={32} height={32} style={{ borderRadius: '8px' }} />
          CyneMora
        </div>
        <nav className={styles.nav}>
          <Link href="/">Home</Link>
          <Link href="/learn-more">Learn More</Link>
          <Link href="/login" className={styles.navBtn}>Sign In</Link>
        </nav>
      </header>

      <main className={styles.hero} style={{ textAlign: 'left', alignItems: 'flex-start', paddingTop: '120px', minHeight: 'auto' }}>
        <h1 className={styles.title} style={{ fontSize: '3rem', marginBottom: '2rem' }}>Support Center</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', width: '100%', maxWidth: '1000px' }}>
          <div className="glass-card" style={{ padding: '3rem', lineHeight: '1.8' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Contact Support</h2>
            <p style={{ marginBottom: '1.5rem' }}>Need assistance with the platform? Our engineering team is ready to help you with rendering issues, agent configurations, or Visual DNA management.</p>
            
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Email Address</label>
                <input type="email" style={{ width: '100%', padding: '0.75rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} placeholder="director@studio.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Issue Category</label>
                <select style={{ width: '100%', padding: '0.75rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}>
                  <option>CyneMora 3.5 Rendering</option>
                  <option>AI Agent Pipeline</option>
                  <option>Visual DNA Continuity</option>
                  <option>Billing & Credits</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Description</label>
                <textarea style={{ width: '100%', padding: '0.75rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', minHeight: '120px' }} placeholder="Describe your issue..." />
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Ticket</button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Ask our AI Assistant</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Get immediate answers about how to use CyneMora's elite features from our integrated AI Assistant.</p>
              <Link href="/learn-more" className="btn btn-secondary" style={{ display: 'inline-block' }}>Open Assistant</Link>
            </div>

            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Documentation</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><Link href="/learn-more" style={{ color: 'var(--color-primary)' }}>→ Platform Overview</Link></li>
                <li><Link href="/terms" style={{ color: 'var(--color-primary)' }}>→ Terms of Service</Link></li>
                <li><Link href="/privacy" style={{ color: 'var(--color-primary)' }}>→ Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
