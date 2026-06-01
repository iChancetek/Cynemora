/* ========================================
   CyneMora — Landing Page
   ======================================== */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./page.module.css";



export default function LandingPage() {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className={styles.landing}>
      {/* ---- Video Background ---- */}
      <div className={styles.videoBackground}>
        <video autoPlay loop muted playsInline src="/Cynemora6.mp4" />
        <div className={styles.videoOverlay} />
      </div>

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
          <button 
            className={styles.hamburgerMenu} 
            aria-label="Menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {isMobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenuDropdown}>
            <Link href="/learn-more" className={styles.mobileNavLink}>Modules</Link>
            <Link href="/support" className={styles.mobileNavLink}>Support</Link>
            <div className={styles.mobileNavDivider} />
            {!loading && user ? (
              <Link href="/dashboard" className={styles.mobileNavBtnSolid}>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className={styles.mobileNavBtnSolid}>
                Sign in ➔
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ---- Hero ---- */}
      <section className={styles.newHero} id="hero">
        <div className={styles.newHeroContent}>
          <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "var(--radius-full)", padding: "5px 14px", color: "#38bdf8", fontSize: "11px", fontWeight: 700, marginBottom: "var(--space-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            🎁 FREE TRIAL ACTIVE: 2 CINEMATIC VIDEOS INCLUDED
          </div>

          <h1 className={styles.newHeroTitle}>
            Turn your ideas <br />
            into <span className={styles.textCyan}>videos in</span> <br />
            <span className={styles.textCyan}>minutes</span>
          </h1>
          
          <p className={styles.newHeroSubtitle}>
            Go from script, image, presentation, or PDF to finished video. No cameras, no crew, no editing skills required. Create full-length videos and hours of content, not just short clips.
          </p>

          <div className={styles.newHeroActions}>
            <Link href="/learn-more" className={styles.newBtnOutline}>
              Learn More
            </Link>
            <Link href={user ? "/dashboard/new" : "/signup"} className={styles.newBtnCyan}>
              Get Started for Free
            </Link>
          </div>

          <p style={{ marginTop: "var(--space-4)", fontSize: "11px", color: "var(--color-text-muted)", opacity: 0.8, fontFamily: "var(--font-body)", lineHeight: "1.5" }}>
            🔒 **No credit card required**. Start your free trial instantly. Includes **2 video generation slots** (up to **8 seconds** each) <br />
            with secure multi-IP abuse checks and mandatory email verification.
          </p>
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
