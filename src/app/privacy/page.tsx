import React from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function PrivacyPage() {
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
        <h1 className={styles.title} style={{ fontSize: '3rem', marginBottom: '2rem' }}>Privacy Policy</h1>
        <div className="glass-card" style={{ padding: '3rem', maxWidth: '800px', width: '100%', lineHeight: '1.8' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Last Updated: May 27, 2026</p>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>1. Introduction</h2>
          <p style={{ marginBottom: '1.5rem' }}>Welcome to CyneMora, the elite cinema-native AI production platform. We prioritize the privacy and security of our filmmakers, creators, and studio partners. This Privacy Policy explains how we collect, use, and protect your data when you use our platform, including our advanced AI Agents and CyneMora 3.5 rendering pipelines.</p>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>2. Information We Collect</h2>
          <p style={{ marginBottom: '1rem' }}>We collect the following types of information:</p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li><strong>Account Data:</strong> Managed securely via Firebase Authentication (email, profile information).</li>
            <li><strong>Production Data:</strong> Your project scripts, narrative graphs, and shot lists stored in Google Cloud Firestore.</li>
            <li><strong>Visual DNA:</strong> Character profiles and reference images uploaded to Firebase Storage for use with Image-to-Video generation.</li>
            <li><strong>Generative Inputs:</strong> Prompts, scene configurations, and instructions fed into our OpenAI multi-agent system and CyneMora 3.5 renderers.</li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>3. How We Use Your Data</h2>
          <p style={{ marginBottom: '1.5rem' }}>Your data is strictly used to facilitate the cinematic production process. We do not use your private scripts or Visual DNA to train our foundational models without explicit opt-in. Generative inputs are securely transmitted to our partner APIs (OpenAI and Google GenAI) solely for the purpose of executing your direct rendering and planning requests.</p>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>4. Data Security</h2>
          <p style={{ marginBottom: '1.5rem' }}>We employ elite-level security measures including strict IAM Firebase rules, ensuring that your projects, generated videos, and Visual DNA are completely isolated and only accessible by your authenticated user session.</p>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>5. Contact Us</h2>
          <p>For privacy inquiries, please visit our <Link href="/support" style={{ color: 'var(--color-primary)' }}>Support Page</Link>.</p>
        </div>
      </main>
    </div>
  );
}
