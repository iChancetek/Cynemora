/* ========================================
   CyneMora — Learn More
   Full-featured platform showcase
   ======================================== */

import React from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

const PLATFORM_CAPABILITIES = [
  {
    icon: "⚡", title: "Text to Video",
    desc: "Describe any scene in natural language. CyneMora 3.5 renders broadcast-quality cinematic video with intelligent camera motion, dramatic lighting, and emotional pacing.",
    features: ["Preset cinematic styles (Noir, Cyberpunk, Sci-Fi)", "Camera movement controls (Pan, Dolly, Zoom, Tilt)", "Up to 8-second generations at full HD", "Visual DNA character injection"],
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(56,189,248,0.08))"
  },
  {
    icon: "🖼️", title: "Image to Video",
    desc: "Upload any image — portraits, landscapes, concept art, product shots — and watch it come alive with cinematic motion, depth parallax, and atmospheric effects.",
    features: ["6 animation styles (Cinematic Pan, Parallax, Orbit)", "Atmosphere effects (Fog, Rain, Golden Hour, Aurora)", "AI-driven depth map analysis", "Seamless motion from single frames"],
    gradient: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(52,211,153,0.08))"
  },
  {
    icon: "🎵", title: "Audio to Video",
    desc: "Upload podcasts, songs, narration, or speeches and CyneMora generates synchronized cinematic visuals matched to emotional tone and rhythm.",
    features: ["Waveform-driven motion graphics", "Emotional tone analysis", "Multiple visual styles (Abstract, Documentary, Music Video)", "Automatic subtitle generation"],
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(167,139,250,0.08))"
  },
  {
    icon: "📊", title: "PPT to Video",
    desc: "Transform presentations into narrated cinematic videos. Upload PowerPoint, Keynote, or PDF and CyneMora auto-generates professional video content.",
    features: ["AI-generated narration with multiple voice styles", "Animated cinematic transitions", "Background music integration", "Intelligent pacing control"],
    gradient: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(56,189,248,0.08))"
  },
  {
    icon: "🤖", title: "AI Avatars",
    desc: "Create ultra-realistic AI digital humans. Build presenters, educators, actors, podcast hosts, and digital twins with natural speech and emotional expressions.",
    features: ["8 avatar types (Presenter, Actor, Twin, Host)", "Personality and voice configuration", "Reference photo-based avatar creation", "Cinematic studio-quality output"],
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(249,115,22,0.08))"
  },
  {
    icon: "🌍", title: "AI Dubbing",
    desc: "Dub your videos into 12+ languages with AI voice cloning, synchronized lip movement, and emotional tone preservation.",
    features: ["Natural voice cloning technology", "AI-powered lip sync adaptation", "Emotional tone preservation", "12 supported languages"],
    gradient: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(167,139,250,0.08))"
  },
  {
    icon: "🎙️", title: "Podcast Studio",
    desc: "Generate professional podcasts without a recording studio. CyneMora handles scripting, voice generation, co-host conversations, sound design, and mastering.",
    features: ["Solo, Duo, Interview, and Panel formats", "8 podcast categories", "AI-generated scripts and dialogue", "Background music and sound design"],
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(52,211,153,0.08))"
  },
  {
    icon: "🎭", title: "Face Swap",
    desc: "Cinematic-quality face replacement with realistic lighting adaptation, facial tracking, expression preservation, and seamless motion blending.",
    features: ["Skin tone matching", "3 quality tiers (Standard, High, Cinematic)", "Expression and motion preservation", "Makeup transfer and age adaptation"],
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(248,113,113,0.08))"
  },
  {
    icon: "🌐", title: "Video Translator",
    desc: "Translate videos into 15+ languages while preserving vocal identity, emotional tone, speech timing, and lip synchronization.",
    features: ["Voice identity preservation", "Burned-in subtitle generation", "SRT export for external platforms", "One-click global publishing"],
    gradient: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(56,189,248,0.08))"
  },
];

const AI_AGENTS = [
  { icon: "📖", name: "Story Architect", role: "Structures narrative arcs, acts, and emotional beats from raw story input." },
  { icon: "🎭", name: "Scene Decomposer", role: "Plans lighting, environments, and blocking for every scene." },
  { icon: "📸", name: "Shot Planner", role: "Translates scenes into exact camera instructions and framing." },
  { icon: "🎬", name: "Director Agent", role: "Oversees creative direction and cinematic consistency." },
  { icon: "🎥", name: "Cinematography Agent", role: "Controls camera language, movement, and visual grammar." },
  { icon: "🧬", name: "Visual DNA Agent", role: "Manages persistent character identity across all shots." },
  { icon: "🔗", name: "Continuity Supervisor", role: "Prevents visual drift and maintains scene coherence." },
  { icon: "⚡", name: "Render Agent", role: "Executes video generation through the CyneMora 3.5 engine." },
  { icon: "✅", name: "QA Agent", role: "Validates quality, consistency, and cinematic standards." },
  { icon: "💎", name: "Credit Agent", role: "Manages cost intelligence and resource optimization." },
  { icon: "🌍", name: "Localization Agent", role: "Handles multilingual dubbing, translation, and cultural adaptation." },
  { icon: "🎙️", name: "Podcast Agent", role: "Scripts, voices, edits, and produces podcast episodes autonomously." },
];

const TECH_STACK = [
  { icon: "🧠", label: "OpenAI GPT-5.4", desc: "Intelligence layer powering all AI agents and reasoning" },
  { icon: "🎥", label: "Google Veo 2.0", desc: "Cinematic video rendering engine" },
  { icon: "🔥", label: "Firebase", desc: "Auth, Firestore, and cloud storage infrastructure" },
  { icon: "⚛️", label: "Next.js", desc: "Full-stack React framework with server components" },
  { icon: "🔊", label: "OpenAI Whisper", desc: "Speech-to-text for voice commands and transcription" },
  { icon: "🗣️", label: "OpenAI TTS", desc: "Text-to-speech for AI assistant and avatar voices" },
];

export default function LearnMorePage() {
  return (
    <div className={styles.landing}>
      {/* ---- Video Background ---- */}
      <div className={styles.videoBackground}>
        <video autoPlay loop muted playsInline src="/cynemora.mp4" />
        <div className={styles.videoOverlay} />
      </div>

      {/* Header */}
      <header className={styles.landingHeader} id="header">
        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/icon-192x192.png" alt="CyneMora Logo" width={32} height={32} style={{ borderRadius: '8px' }} />
          CyneMora
        </div>
        <nav className={styles.headerNav}>
          <Link href="/" className="btn btn-ghost btn-sm">Home</Link>
          <Link href="/support" className="btn btn-ghost btn-sm">Support</Link>
          <Link href="/login" className="btn btn-primary btn-sm">Sign In</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className={styles.hero} id="learn-hero" style={{ minHeight: 'auto', paddingBottom: 'var(--space-16)' }}>
        <div className={styles.heroBg}>
          <div className={styles.heroGrid} />
          <div className={`${styles.orb} ${styles.orb1}`} />
          <div className={`${styles.orb} ${styles.orb2}`} />
          <div className={`${styles.orb} ${styles.orb3}`} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className="badge badge-primary">✦ The Future of Cinematic AI</span>
          </div>
          <h1 className={styles.heroTitle}>
            The World&apos;s Most Advanced
            <br />
            <span className="text-gradient">AI Cinema Studio</span>
          </h1>
          <p className={styles.heroSubtitle}>
            CyneMora is an autonomous AI cinematic media operating system — combining video generation,
            AI avatars, dubbing, podcasting, localization, and intelligent production workflows into one unified creative platform.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>12</div>
              <div className={styles.heroStatLabel}>AI Agents</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>9+</div>
              <div className={styles.heroStatLabel}>Creation Tools</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>15+</div>
              <div className={styles.heroStatLabel}>Languages</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>4K</div>
              <div className={styles.heroStatLabel}>Cinematic</div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className={styles.pipelineSection} id="capabilities">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionOverline}>Complete Creative Suite</div>
          <h2 className={styles.sectionTitle}>
            Every Tool You Need,
            <br />
            <span className="text-gradient">One Platform</span>
          </h2>
          <p className={styles.sectionDescription}>
            From text-to-video and AI avatars to dubbing and podcasting — CyneMora is a complete autonomous AI media production studio.
          </p>
        </div>

        <div style={{ maxWidth: 'var(--max-width-wide)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-6)' }}>
          {PLATFORM_CAPABILITIES.map((cap) => (
            <div key={cap.title} className="glass-card" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: cap.gradient }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)', fontSize: '24px', background: cap.gradient, border: '1px solid rgba(167,139,250,0.15)', flexShrink: 0 }}>
                  {cap.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }}>{cap.title}</h3>
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>{cap.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', margin: 0 }}>
                {cap.features.map((f) => (
                  <li key={f} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--color-primary-light)', fontSize: '10px', flexShrink: 0 }}>✦</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI Agent Network */}
      <section className={styles.agentsSection} id="agents">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionOverline}>Autonomous AI Infrastructure</div>
          <h2 className={styles.sectionTitle}>
            12 Specialized Agents,
            <br />
            <span className="text-gradient">One Invisible Team</span>
          </h2>
          <p className={styles.sectionDescription}>
            Every CyneMora production is orchestrated by a network of specialized AI agents
            that collaborate behind the scenes. You direct — they execute.
          </p>
        </div>

        <div style={{ maxWidth: 'var(--max-width-wide)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
          {AI_AGENTS.map((agent) => (
            <div key={agent.name} className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-xl)', fontSize: '24px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                {agent.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{agent.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', lineHeight: 'var(--leading-relaxed)' }}>{agent.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Stack */}
      <section className={styles.pipelineSection} id="tech">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionOverline}>Enterprise Infrastructure</div>
          <h2 className={styles.sectionTitle}>
            Built On
            <br />
            <span className="text-gradient">World-Class AI</span>
          </h2>
          <p className={styles.sectionDescription}>
            CyneMora separates intelligence from rendering. OpenAI powers the brain.
            Google Veo powers the camera. Firebase powers the cloud.
          </p>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
          {TECH_STACK.map((tech) => (
            <div key={tech.label} className="glass-card" style={{ padding: 'var(--space-6)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ fontSize: '36px' }}>{tech.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700 }}>{tech.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{tech.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.agentsSection} id="how">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionOverline}>Effortless Workflow</div>
          <h2 className={styles.sectionTitle}>
            Three Steps to
            <br />
            <span className="text-gradient">Cinema</span>
          </h2>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-8)' }}>
          {[
            { num: "01", title: "Imagine", desc: "Describe your vision in natural language. Upload images, audio, presentations, or write a script. CyneMora understands intent at every level." },
            { num: "02", title: "Create", desc: "Select your tool — Text-to-Video, AI Avatars, Podcast Studio, Dubbing, or any creation module. Configure style, mood, and parameters." },
            { num: "03", title: "Publish", desc: "CyneMora renders, translates, localizes, and exports your content. Share globally with one click in 15+ languages." },
          ].map((step) => (
            <div key={step.num} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(56,189,248,0.1))', border: '2px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                {step.num}
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}>{step.title}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>
            Ready to Build the
            <br />
            <span className="text-gradient">Future of Cinema?</span>
          </h2>
          <p className={styles.ctaDescription}>
            Join the autonomous AI media revolution. Create videos, avatars, podcasts, and cinematic content — all from one platform.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/signup" className="btn btn-primary btn-lg">Start Creating Free</Link>
            <Link href="/support" className="btn btn-secondary btn-lg">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.landingFooter}>
        <div className={styles.footerBrand}>
          CyneMora <span>— A ChanceTEK LLC Company</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem', justifyContent: 'center' }}>
          <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Home</Link>
          <Link href="/support" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Support</Link>
          <Link href="/terms" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Terms</Link>
          <Link href="/privacy" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
