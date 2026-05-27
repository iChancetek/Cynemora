import React from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function TermsPage() {
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
        <h1 className={styles.title} style={{ fontSize: '3rem', marginBottom: '2rem' }}>Terms of Service</h1>
        <div className="glass-card" style={{ padding: '3rem', maxWidth: '800px', width: '100%', lineHeight: '1.8' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Last Updated: May 27, 2026</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: '1.5rem' }}>By accessing and using CyneMora, you agree to be bound by these Terms of Service. CyneMora is an elite, cinema-native AI production platform intended for professional filmmakers and creators.</p>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>2. Platform Services</h2>
          <p style={{ marginBottom: '1.5rem' }}>CyneMora provides access to specialized AI Agents (including the Story Architect, Scene Decomposer, Shot Planner, and Continuity Supervisor) and integrates with advanced AI rendering tools such as CyneMora 3.5 for video rendering. Availability of these services is subject to backend API uptime and platform maintenance.</p>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>3. User Content & Intellectual Property</h2>
          <p style={{ marginBottom: '1.5rem' }}>You retain all intellectual property rights to the scripts, narrative graphs, and Visual DNA you upload to the platform. You grant CyneMora a temporary, secure license to process this data exclusively to fulfill your generation requests. Generated videos remain your property, subject to the licensing terms of the underlying AI providers (OpenAI, Google).</p>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>4. Acceptable Use</h2>
          <p style={{ marginBottom: '1.5rem' }}>You agree not to use CyneMora's multi-agent systems or rendering pipelines to generate illegal, non-consensual, or prohibited content. Any abuse of the CyneMora 3.5 rendering systems or Firebase Storage buckets will result in immediate termination of your account.</p>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>5. Limitation of Liability</h2>
          <p>CyneMora is provided "as is" without warranty. We are not liable for production delays or generation errors caused by downstream AI providers.</p>
        </div>
      </main>
    </div>
  );
}
