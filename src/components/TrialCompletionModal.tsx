/* ========================================
   CyneMora — Trial Completion & Upgrade Modal
   Motivational, visual value-focused upgrade wall
   ======================================== */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";

interface TrialCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrialCompletionModal({ isOpen, onClose }: TrialCompletionModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  
  // Real-time calculated stats from trial
  const [stats, setStats] = useState({
    videosCreated: 2,
    secondsGenerated: 16,
    assetsUploaded: 3,
    voicesUsed: 1
  });

  useEffect(() => {
    if (!user || !isOpen) return;

    // Fetch user details and trial parameters dynamically to highlight their actual value received
    const fetchTrialUsage = async () => {
      try {
        const balanceDoc = await getDoc(doc(db, "creditBalances", user.uid));
        if (balanceDoc.exists()) {
          const data = balanceDoc.data();
          if (data) {
            setStats({
              videosCreated: data.used || 2,
              secondsGenerated: (data.used || 2) * 8,
              assetsUploaded: 3, // Fallback/Simulated asset counts
              voicesUsed: 1
            });
          }
        }
      } catch (err) {
        console.warn("Could not retrieve precise usage metrics for upgrade modal:", err);
      }
    };

    fetchTrialUsage();
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = async (tier: "standard" | "premium") => {
    if (!user) return;
    try {
      setLoadingCheckout(tier);

      // Track conversion analytics click events to Firestore securely
      try {
        await addDoc(collection(db, "conversions"), {
          userId: user.uid,
          email: user.email || "unknown@cynemora.com",
          selectedPlan: tier,
          timestamp: new Date(),
          event: "trial_to_paid_conversion_click"
        });
        console.log(`[Analytics] Trial conversion tracked: ${tier} by ${user.email}`);
      } catch (analyticsErr) {
        console.warn("Could not log conversion click to database:", analyticsErr);
      }

      // Initialize dynamic Stripe / Simulated checkout session
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier })
      });

      if (!res.ok) throw new Error("Failed to initialize checkout session.");
      const json = await res.json();
      if (json.success && json.url) {
        onClose();
        window.location.href = json.url;
      } else {
        throw new Error(json.error || "Setup session error");
      }
    } catch (err: any) {
      alert(`Billing Redirect Failed: ${err.message}`);
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleBrowsePricing = () => {
    onClose();
    router.push("/dashboard/credits");
  };

  return (
    <div className="trial-modal-overlay">
      {/* Dynamic Inline CSS Injection for Premium Cinematic Animations */}
      <style>{`
        .trial-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(4, 4, 6, 0.9);
          backdrop-filter: blur(16px);
          overflow-y: auto;
          padding: 24px;
          font-family: var(--font-body), system-ui, -apple-system, sans-serif;
        }

        .trial-modal-card {
          position: relative;
          width: 100%;
          max-width: 820px;
          background: rgba(14, 13, 20, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-2xl, 24px);
          padding: 36px;
          color: var(--color-text-primary, #fff);
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 80px rgba(56, 189, 248, 0.08);
          animation: modalSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Cinematic Starfield & Nebulae */
        .trial-modal-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .trial-modal-nebula-1 {
          position: absolute;
          top: -20%;
          right: -20%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 70%);
          filter: blur(70px);
          animation: nebulaPulse 10s ease-in-out infinite alternate;
        }

        .trial-modal-nebula-2 {
          position: absolute;
          bottom: -20%;
          left: -20%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(167, 139, 250, 0.12) 0%, rgba(167, 139, 250, 0) 70%);
          filter: blur(70px);
          animation: nebulaPulse 14s ease-in-out infinite alternate-reverse;
        }

        .trial-modal-stars {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 50px 100px, rgba(255,255,255,0.5), rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 150px 200px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 220px 80px, rgba(255,255,255,0.7), rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 300px 300px;
          opacity: 0.25;
          animation: starsFloat 40s linear infinite;
        }

        /* Modal Layout */
        .trial-modal-body {
          position: relative;
          z-index: 1;
        }

        .trial-modal-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .trial-modal-title {
          font-family: var(--font-display), system-ui, sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #fff 40%, var(--color-primary-light, #38bdf8));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .trial-modal-msg {
          font-size: 14px;
          color: var(--color-text-secondary, rgba(255, 255, 255, 0.75));
          line-height: 1.6;
          max-width: 620px;
          margin: 0 auto 20px auto;
        }

        /* Value Highlight & Progress split */
        .trial-split-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }

        .trial-info-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-xl, 16px);
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .trial-progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 700;
          color: var(--color-primary-light, #38bdf8);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .trial-progress-bar-wrap {
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .trial-progress-bar {
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, var(--color-primary, #38bdf8), var(--color-accent, #a78bfa));
          box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
        }

        .trial-summary-list {
          padding-left: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .trial-summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
        }

        .trial-summary-check {
          color: var(--color-success, #34d399);
          font-weight: 700;
        }

        /* Why Upgrade Section */
        .trial-why-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-xl, 16px);
          padding: 20px;
        }

        .trial-why-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-text-muted, rgba(255,255,255,0.4));
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .trial-why-list {
          padding-left: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .trial-why-item {
          font-size: 13px;
          color: var(--color-text-secondary, rgba(255,255,255,0.7));
          line-height: 1.4;
        }

        .trial-why-item strong {
          color: #fff;
          font-weight: 600;
        }

        /* Tiers 3-Column Grid */
        .trial-tiers-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .trial-tier-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-xl, 18px);
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.3s ease;
        }

        .trial-tier-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          transform: translateY(-2px);
        }

        .trial-tier-featured {
          border-color: rgba(167, 139, 250, 0.25);
          background: rgba(167, 139, 250, 0.01);
        }

        .trial-tier-featured:hover {
          border-color: rgba(167, 139, 250, 0.4);
          background: rgba(167, 139, 250, 0.03);
        }

        .trial-tier-header {
          margin-bottom: 16px;
        }

        .trial-tier-badge {
          display: inline-block;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 99px;
          margin-bottom: 8px;
        }

        .trial-badge-standard {
          background: rgba(56, 189, 248, 0.1);
          color: #38bdf8;
        }

        .trial-badge-premium {
          background: rgba(167, 139, 250, 0.1);
          color: #a78bfa;
        }

        .trial-badge-enterprise {
          background: rgba(52, 211, 153, 0.1);
          color: #34d399;
        }

        .trial-tier-name {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 2px;
        }

        .trial-tier-ideal {
          font-size: 9px;
          color: var(--color-text-muted, rgba(255,255,255,0.45));
          margin-bottom: 10px;
          font-style: italic;
        }

        .trial-tier-list {
          padding-left: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
          height: 125px;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .trial-tier-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--color-text-secondary, rgba(255,255,255,0.7));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .trial-upgrade-btn {
          width: 100%;
          height: 36px;
          border-radius: var(--radius-md, 8px);
          font-size: 11px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 14px;
        }

        .trial-btn-standard {
          background: #38bdf8;
          color: #000;
        }

        .trial-btn-standard:hover {
          background: #7dd3fc;
        }

        .trial-btn-premium {
          background: linear-gradient(135deg, #a78bfa, #c084fc);
          color: #fff;
        }

        .trial-btn-premium:hover {
          background: linear-gradient(135deg, #c084fc, #d8b4fe);
        }

        .trial-btn-enterprise {
          background: rgba(255,255,255,0.06);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .trial-btn-enterprise:hover {
          background: rgba(255,255,255,0.1);
        }

        .trial-upgrade-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .trial-modal-footer {
          text-align: center;
          margin-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }

        .trial-footer-links {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 11px;
          color: var(--color-text-muted, rgba(255,255,255,0.4));
          margin-bottom: 12px;
        }

        .trial-footer-link {
          color: var(--color-text-secondary, rgba(255,255,255,0.7));
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
        }

        .trial-footer-link:hover {
          color: #fff;
        }

        .trial-footer-note {
          font-size: 10px;
          color: var(--color-text-muted, rgba(255,255,255,0.4));
          line-height: 1.45;
          max-width: 580px;
          margin: 0 auto;
        }

        /* Animations */
        @keyframes modalSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes nebulaPulse {
          from { transform: scale(0.9) rotate(0deg); opacity: 0.7; }
          to { transform: scale(1.1) rotate(45deg); opacity: 1; }
        }

        @keyframes starsFloat {
          from { background-position: 0 0; }
          to { background-position: 300px 600px; }
        }

        @media (max-width: 768px) {
          .trial-tiers-grid {
            grid-template-columns: 1fr;
          }
          .trial-split-layout {
            grid-template-columns: 1fr;
          }
          .trial-modal-card {
            padding: 24px;
          }
        }
      `}</style>

      {/* Starfield Nebulae Backdrop */}
      <div className="trial-modal-card">
        <div className="trial-modal-bg">
          <div className="trial-modal-nebula-1" />
          <div className="trial-modal-nebula-2" />
          <div className="trial-modal-stars" />
        </div>

        {/* Modal Main View */}
        <div className="trial-modal-body">
          <header className="trial-modal-header">
            <div style={{ fontSize: "32px", marginBottom: "6px" }}>🎬</div>
            <h2 className="trial-modal-title">Your Free Trial Has Ended</h2>
            <p className="trial-modal-msg">
              Thank you for trying CyneMora. You have successfully used your <strong>2 free AI video generations</strong> and explored the power of our AI-native cinematic video platform.
              To continue creating professional, studio-quality videos, please select a subscription plan below.
            </p>
          </header>

          {/* Usage & Why upgrade Split Layout */}
          <div className="trial-split-layout">
            {/* Trial Usage Summary Card */}
            <div className="trial-info-box">
              <div className="trial-progress-info">
                <span>Usage Summary</span>
                <span>2 of 2 Trial Videos Used</span>
              </div>
              <div className="trial-progress-bar-wrap">
                <div className="trial-progress-bar" />
              </div>

              <ul className="trial-summary-list">
                <li className="trial-summary-item"><span className="trial-summary-check">✓</span> Trial Videos Generated: 2 of 2</li>
                <li className="trial-summary-item"><span className="trial-summary-check">✓</span> AI Processing Completed</li>
                <li className="trial-summary-item"><span className="trial-summary-check">✓</span> Projects Saved</li>
                <li className="trial-summary-item"><span className="trial-summary-check">✓</span> Assets Retained</li>
                <li className="trial-summary-item"><span className="trial-summary-check">✓</span> Account Ready for Upgrade</li>
              </ul>
            </div>

            {/* Why Upgrade Block */}
            <div className="trial-why-box">
              <div className="trial-why-title">Why Upgrade?</div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "8px", lineHeight: "1.4" }}>
                Unlock advanced narrative engineering workflows to transform:
              </p>
              <ul className="trial-why-list">
                <li className="trial-why-item">✦ <strong>Text</strong> into cinematic videos</li>
                <li className="trial-why-item">✦ <strong>Images</strong> into dynamic visual stories</li>
                <li className="trial-why-item">✦ <strong>PDFs</strong> into engaging presentations</li>
                <li className="trial-why-item">✦ <strong>Scripts</strong> into narrated productions</li>
                <li className="trial-why-item">✦ <strong>Ideas</strong> into professional marketing content</li>
              </ul>
            </div>
          </div>

          {/* Tiers 3-Column Plan Comparison Grid */}
          <div className="trial-tiers-grid">
            {/* Standard Plan */}
            <div className="trial-tier-card">
              <div className="trial-tier-header">
                <span className="trial-tier-badge trial-badge-standard">Standard</span>
                <h4 className="trial-tier-name">Standard Plan</h4>
                <div className="trial-tier-ideal">Ideal for Creators, Marketers, Educators</div>
                
                <ul className="trial-tier-list">
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> AI Text-to-Video Generation</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> AI Image-to-Video Generation</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Premium AI Voiceovers</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> HD & Full HD Exports</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Advanced Video Editing</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Stock Media Library Access</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Cloud Storage & Support</li>
                </ul>
              </div>
              <button
                className="trial-upgrade-btn trial-btn-standard"
                onClick={() => handleUpgrade("standard")}
                disabled={loadingCheckout !== null}
              >
                {loadingCheckout === "standard" ? "Redirecting..." : "[ Upgrade to Standard ]"}
              </button>
            </div>

            {/* Premium Plan */}
            <div className="trial-tier-card trial-tier-featured">
              <div className="trial-tier-header">
                <span className="trial-tier-badge trial-badge-premium">★ Premium</span>
                <h4 className="trial-tier-name">Premium Plan</h4>
                <div className="trial-tier-ideal">Ideal for Agencies & Production Teams</div>
                
                <ul className="trial-tier-list">
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Everything in Standard Plus</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Ultra HD / 4K Video Exports</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Custom AI Avatars & Voice Cloning</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Advanced Character Consistency</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Premium Cinematic Effects</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Multi-Scene Story Generation</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Team Collaboration & Speed</li>
                </ul>
              </div>
              <button
                className="trial-upgrade-btn trial-btn-premium"
                onClick={() => handleUpgrade("premium")}
                disabled={loadingCheckout !== null}
              >
                {loadingCheckout === "premium" ? "Redirecting..." : "[ Upgrade to Premium ]"}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="trial-tier-card">
              <div className="trial-tier-header">
                <span className="trial-tier-badge trial-badge-enterprise">Enterprise</span>
                <h4 className="trial-tier-name">Enterprise Plan</h4>
                <div className="trial-tier-ideal">Ideal for Organizations & Corporations</div>
                
                <ul className="trial-tier-list">
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Everything in Premium Plus</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Unlimited Team Members & SSO</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Dedicated Account Manager</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> API Access & Private Models</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Custom SLA & White-labeling</li>
                  <li className="trial-tier-item"><span className="trial-summary-check">✓</span> Dedicated Cloud Infrastructure</li>
                </ul>
              </div>
              <a
                href="mailto:sales@cynemora.com?subject=CyneMora%20Enterprise%20Plan%20Inquiry"
                className="trial-upgrade-btn trial-btn-enterprise"
                style={{ textDecoration: "none" }}
              >
                [ Contact Sales ]
              </a>
            </div>
          </div>

          {/* Alternate Footer Actions */}
          <footer className="trial-modal-footer">
            <div className="trial-footer-links">
              <span className="trial-footer-link" onClick={handleBrowsePricing}>Compare Plans</span>
              <span>•</span>
              <span className="trial-footer-link" onClick={handleBrowsePricing}>View Pricing</span>
              <span>•</span>
              <a href="mailto:sales@cynemora.com?subject=CyneMora%20Plan%20Inquiry" className="trial-footer-link">Contact Sales</a>
              <span>•</span>
              <a href="https://calendly.com/cynemora/demo" target="_blank" rel="noopener noreferrer" className="trial-footer-link">Schedule a Demo</a>
            </div>
            
            <p className="trial-footer-note">
              Thank you for trying CyneMora. Your existing projects, uploaded assets, and generated videos remain safely stored in your account and will be immediately available after upgrading.
              <br />
              <strong style={{ color: "#fff" }}>Ready to continue creating? Upgrade now to start producing unlimited cinematic content today.</strong>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
