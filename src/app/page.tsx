/* ========================================
   Cynemora — Landing Page
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
    desc: "Write your story, paste a script, or describe a concept. Cynemora understands narrative at every level.",
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
    desc: "Shots render through Veo 3.1 with continuity context, character state, and cinematic directives.",
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
      <header className={styles.landingHeader} id="header">
        <div className={styles.logo}>
          <div className={styles.logoMark}>C</div>
          Cynemora
        </div>
        <nav className={styles.headerNav}>
          <a href="#pipeline" className="btn btn-ghost btn-sm">Features</a>
          <a href="#agents" className="btn btn-ghost btn-sm">Pipeline</a>
          {!loading && user ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm" id="header-login">
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className={styles.hero} id="hero">
        <div className={styles.heroBg}>
          <div className={styles.heroGrid} />
          <div className={`${styles.orb} ${styles.orb1}`} />
          <div className={`${styles.orb} ${styles.orb2}`} />
          <div className={`${styles.orb} ${styles.orb3}`} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className="badge badge-primary">
              ✦ A ChanceTEK LLC Company
            </span>
          </div>

          <h1 className={styles.heroTitle}>
            Cinema-Native
            <br />
            <span className="text-gradient">Production OS</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Transform stories into structured cinematic productions. 
            AI-powered orchestration, shot-based generation, continuity systems, 
            and persistent identity management.
          </p>

          <div className={styles.heroActions}>
            <Link
              href={user ? "/dashboard/new" : "/signup"}
              className="btn btn-primary btn-lg"
              id="cta-start"
            >
              Start Creating
            </Link>
            <a href="#pipeline" className="btn btn-secondary btn-lg" id="cta-demo">
              Explore Pipeline
            </a>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>10</div>
              <div className={styles.heroStatLabel}>AI Agents</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>∞</div>
              <div className={styles.heroStatLabel}>Stories</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>4K</div>
              <div className={styles.heroStatLabel}>Cinematic</div>
            </div>
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
          Cynemora <span>— A ChanceTEK LLC Company</span>
        </div>
      </footer>
    </div>
  );
}
