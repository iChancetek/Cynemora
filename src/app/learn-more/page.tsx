import React from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

export default function LearnMorePage() {
  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/icon-192x192.png" alt="CyneMora Logo" width={32} height={32} style={{ borderRadius: '8px' }} />
          CyneMora
        </div>
        <nav className={styles.nav}>
          <Link href="/">Home</Link>
          <Link href="/support">Support</Link>
          <Link href="/login" className={styles.navBtn}>Sign In</Link>
        </nav>
      </header>

      <main className={styles.hero} style={{ textAlign: 'left', alignItems: 'flex-start', paddingTop: '120px', minHeight: 'auto', paddingBottom: '100px' }}>
        <h1 className={styles.title} style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome to the Future of Cinema
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', marginBottom: '3rem', maxWidth: '800px', lineHeight: '1.6' }}>
          CyneMora is an elite, cinema-native AI production platform. We bridge the gap between raw imagination and broadcast-ready video by acting as a virtual film studio powered by cutting-edge intelligence.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1200px' }}>
          
          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Multi-Agent Orchestration</h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
              Directing a film takes a team. CyneMora employs specialized AI Agents to handle every aspect of pre-production and visualization.
            </p>
            <ul style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', paddingLeft: '1.2rem' }}>
              <li><strong>Story Architect:</strong> Structures acts and themes.</li>
              <li><strong>Scene Decomposer:</strong> Plans lighting and environments.</li>
              <li><strong>Shot Planner:</strong> Translates scenes into exact camera instructions.</li>
              <li><strong>Continuity Supervisor:</strong> Validates visual consistency across shots.</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧬</div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Visual DNA Vault</h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
              Continuity is the hardest part of AI video. The Visual DNA vault allows you to upload reference images and deep semantic descriptions of your cast. When generating a scene, the platform injects this DNA directly into the rendering pipeline, locking in the actor's facial structure and wardrobe across every shot.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎬</div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>CyneMora 3.5 Engine</h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
              We route your compiled cinematic shots directly into the elite CyneMora 3.5 infrastructure. Enjoy native support for 1080p and 720p resolutions, precise Text-to-Video and Image-to-Video rendering, and durations up to 8 seconds.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Flow Playground</h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
              A rapid prototyping space designed for directors. Instantly generate standalone shots using preset cinematic styles (e.g., Cyberpunk, Noir) and complex camera movements (Pan, Drone, Tracking) without leaving the interface.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
