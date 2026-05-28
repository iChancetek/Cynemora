/* ========================================
   CyneMora — Landing Page
   ======================================== */

"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./page.module.css";

const PIPELINE_STEPS = [
  {
    step: "01",
    icon: "📝",
    title: "Story Input",
    desc: "Write your story, paste a script, or describe a concept. CyneMora understands narrative at every level.",
  },
  {
    step: "02",
    icon: "🧠",
    title: "AI Story Intelligence",
    desc: "OpenAI-powered agents interpret your story into structured narrative graphs — acts, scenes, beats, and emotional arcs.",
  },
  {
    step: "03",
    icon: "🎬",
    title: "Shot Planning",
    desc: "Scenes decompose into cinematic shot plans with framing, movement, pacing, and camera instructions.",
  },
  {
    step: "04",
    icon: "🎨",
    title: "Prompt Compilation",
    desc: "Natural language becomes structured render instructions. You never write raw rendering prompts.",
  },
  {
    step: "05",
    icon: "🎥",
    title: "Cinematic Rendering",
    desc: "Shots render through CyneMora 3.5 with continuity context, character state, and cinematic directives.",
  },
  {
    step: "06",
    icon: "🎞️",
    title: "Sequence Assembly",
    desc: "Rendered shots assemble into sequences with continuity validation, playback, and export.",
  },
];

const AGENTS = [
  { icon: "📖", name: "Story Agent", role: "Narrative architecture" },
  { icon: "🎭", name: "Scene Agent", role: "Scene decomposition" },
  { icon: "📸", name: "Shot Agent", role: "Shot planning" },
  { icon: "🎬", name: "Director Agent", role: "Creative direction" },
  { icon: "🎥", name: "Cinematography", role: "Camera language" },
  { icon: "🧬", name: "Visual DNA", role: "Identity persistence" },
  { icon: "🔗", name: "Continuity", role: "Drift prevention" },
  { icon: "⚡", name: "Render Agent", role: "Generation execution" },
  { icon: "✅", name: "QA Agent", role: "Quality validation" },
  { icon: "💎", name: "Credit Agent", role: "Cost intelligence" },
];

const STANDARD_FEATURES = [
  "Story creation & shot generation",
  "AI-powered cinematic rendering",
  "Timeline workflows & editing",
  "Standard exports (1080p)",
  "Queue-based rendering",
  "Mobile PWA support",
  "Standard continuity tracking",
];

const PREMIUM_FEATURES = [
  "Everything in Standard",
  "Priority rendering queue",
  "Advanced continuity engine",
  "Visual DNA persistence",
  "Collaboration tools",
  "Sequence chaining (long-form)",
  "4K cinematic exports",
  "Expanded credit rates",
];

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className={styles.landing}>
      {/* ---- Header ---- */}
      <header className={styles.newHeader} id="header">
        <div className={styles.newLogo}>
          <img src="/icon-192x192.png" alt="CyneMora Logo" width={32} height={32} style={{ borderRadius: '8px' }} />
          CyneMora
        </div>
        <nav className={styles.newHeaderNav}>
          {!loading && user ? (
            <Link href="/dashboard" className={styles.newBtnSolid}>
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className={styles.newBtnSolid}>
              Sign in ➔
            </Link>
          )}
          <button className={styles.hamburgerMenu} aria-label="Menu">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className={styles.newHero} id="hero">
        <div className={styles.newHeroContent}>
          <h1 className={styles.newHeroTitle}>
            Turn your ideas <br />
            into <span className={styles.textCyan}>videos in</span> <br />
            <span className={styles.textCyan}>minutes</span>
          </h1>
          
          <p className={styles.newHeroSubtitle}>
            Go from script, image, presentation, or PDF to finished video. No cameras, no crew, no editing skills required. Create full-length videos and hours of content, not just short clips.
          </p>

          <div className={styles.newHeroActions}>
            <Link href="/signup" className={styles.newBtnOutline}>
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </Link>
            <Link href={user ? "/dashboard/new" : "/signup"} className={styles.newBtnCyan}>
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Pipeline Section ---- */}
      <section className={styles.pipelineSection} id="pipeline">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionOverline}>Cinematic Pipeline</div>
          <h2 className={styles.sectionTitle}>
            Stories Become
            <br />
            <span className="text-gradient">Production Plans</span>
          </h2>
          <p className={styles.sectionDescription}>
            Stories never become video directly. They become structured cinematic
            production plans — then cinema.
          </p>
        </div>

        <div className={styles.pipelineGrid}>
          {PIPELINE_STEPS.map((step) => (
            <div
              key={step.step}
              className={`glass-card ${styles.pipelineCard}`}
            >
              <div className={styles.pipelineStep}>Step {step.step}</div>
              <div className={styles.pipelineIcon}>{step.icon}</div>
              <h3 className={styles.pipelineCardTitle}>{step.title}</h3>
              <p className={styles.pipelineCardDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Agents Section ---- */}
      <section className={styles.agentsSection} id="agents">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionOverline}>Multi-Agent System</div>
          <h2 className={styles.sectionTitle}>
            Orchestrated
            <br />
            <span className="text-gradient">Intelligence</span>
          </h2>
          <p className={styles.sectionDescription}>
            Ten specialized AI agents work in concert — each constrained to its domain,
            producing structured production data through the OpenAI Agents SDK.
          </p>
        </div>

        <div className={styles.agentsGrid}>
          {AGENTS.map((agent) => (
            <div
              key={agent.name}
              className={`glass-card ${styles.agentCard}`}
            >
              <div className={styles.agentIcon}>{agent.icon}</div>
              <div className={styles.agentName}>{agent.name}</div>
              <div className={styles.agentRole}>{agent.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Tiers Section ---- */}
      <section className={styles.tiersSection} id="tiers">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionOverline}>Production Tiers</div>
          <h2 className={styles.sectionTitle}>
            Scale Your
            <br />
            <span className="text-gradient">Cinema</span>
          </h2>
          <p className={styles.sectionDescription}>
            From accessible creation to professional production.
            Credits are your universal generation currency.
          </p>
        </div>

        <div className={styles.tiersGrid}>
          {/* Standard Tier */}
          <div className={`glass-card ${styles.tierCard}`}>
            <div>
              <span className="badge badge-accent">Standard</span>
            </div>
            <h3 className={styles.tierName}>Standard</h3>
            <p className={styles.tierPurpose}>
              Accessible cinematic creation for every storyteller.
            </p>
            <ul className={styles.tierFeatures}>
              {STANDARD_FEATURES.map((feature) => (
                <li key={feature}>
                  <span className={styles.featureCheck}>✦</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="btn btn-secondary btn-lg"
            >
              Get Started
            </Link>
          </div>

          {/* Premium Tier */}
          <div
            className={`glass-card ${styles.tierCard} ${styles.tierCardFeatured}`}
          >
            <div>
              <span className="badge badge-primary">★ Premium</span>
            </div>
            <h3 className={styles.tierName}>
              <span className="text-gradient">Premium</span>
            </h3>
            <p className={styles.tierPurpose}>
              Professional cinematic production for studios and creators.
            </p>
            <ul className={styles.tierFeatures}>
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature}>
                  <span className={styles.featureCheck}>✦</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="btn btn-primary btn-lg"
            >
              Upgrade to Premium
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CTA Section ---- */}
      <section className={styles.ctaSection} id="cta">
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>
            Ready to Create
            <br />
            <span className="text-gradient">Cinema?</span>
          </h2>
          <p className={styles.ctaDescription}>
            Transform your stories into structured cinematic productions.
            No prompt engineering. No single-provider lock-in. Just cinema.
          </p>
          <Link
            href={user ? "/dashboard/new" : "/signup"}
            className="btn btn-primary btn-lg"
            id="cta-final"
          >
            Start Your Production
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className={styles.landingFooter}>
        <div className={styles.footerBrand}>
          CyneMora <span>— A ChanceTEK LLC Company</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
          <Link href="/learn-more" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Learn More</Link>
          <Link href="/support" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Support</Link>
          <Link href="/terms" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/privacy" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
