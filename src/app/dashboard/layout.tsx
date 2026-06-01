/* ========================================
   CyneMora — Dashboard Layout
   Sidebar navigation + main content area
   ======================================== */

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./dashboard.module.css";

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Production",
    items: [
      { icon: "🎬", label: "Dashboard", href: "/dashboard" },
      { icon: "📁", label: "Projects", href: "/dashboard/projects" },
      { icon: "✨", label: "New Project", href: "/dashboard/new" },
    ],
  },
  {
    label: "Create",
    items: [
      { icon: "⚡", label: "Text to Video", href: "/dashboard/flow" },
      { icon: "🖼️", label: "Image to Video", href: "/dashboard/image-to-video" },
      { icon: "🎵", label: "Audio to Video", href: "/dashboard/audio-to-video" },
      { icon: "📊", label: "PPT to Video", href: "/dashboard/ppt-to-video" },
      { icon: "🎬", label: "Movie Studio", href: "/dashboard/movie-studio" },
      { icon: "🎨", label: "AI Image Studio", href: "/dashboard/image-studio" },
    ],
  },
  {
    label: "AI Studio",
    items: [
      { icon: "🤖", label: "AI Avatars", href: "/dashboard/avatars" },
      { icon: "🌍", label: "AI Dubbing", href: "/dashboard/dubbing" },
      { icon: "🎙️", label: "Podcast Studio", href: "/dashboard/podcast" },
      { icon: "🎭", label: "Face Swap", href: "/dashboard/face-swap" },
      { icon: "🌐", label: "Video Translator", href: "/dashboard/translator" },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: "🧠", label: "AI Agents", href: "/dashboard/agents" },
      { icon: "🎥", label: "Render Queue", href: "/dashboard/renders" },
      { icon: "🧬", label: "Visual DNA", href: "/dashboard/visual-dna" },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: "💎", label: "Credits", href: "/dashboard/credits" },
      { icon: "⚙️", label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

import { useEffect, useState as reactState } from "react";
import { sendEmailVerification } from "firebase/auth";
import TrialCompletionModal from "@/components/TrialCompletionModal";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, signOut, reloadUser } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isTrialExpiredModalOpen, setIsTrialExpiredModalOpen] = useState(false);

  // Listen to trial expired trigger events
  useEffect(() => {
    const handleOpenTrialExpired = () => {
      setIsTrialExpiredModalOpen(true);
    };
    window.addEventListener("cynemora:open-trial-expired", handleOpenTrialExpired);
    return () => {
      window.removeEventListener("cynemora:open-trial-expired", handleOpenTrialExpired);
    };
  }, []);

  // Handle resend email cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (!user || cooldown > 0) return;
    setResending(true);
    setStatusMessage("");
    try {
      await sendEmailVerification(user);
      setStatusMessage("Verification email sent! Please check your inbox.");
      setCooldown(60); // 60s cooldown
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to send verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    setStatusMessage("");
    try {
      await reloadUser();
      setStatusMessage("Account status refreshed.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to refresh status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  // Platform administrators bypass email verification gating
  const PLATFORM_ADMINS = ["chancellor@ichancetek.com", "chanceminus@gmail.com"];
  const isAdmin = user?.email ? PLATFORM_ADMINS.includes(user.email.toLowerCase()) : false;

  if (user && !user.emailVerified && !isAdmin) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at top right, rgba(167, 139, 250, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.05), transparent 40%), #0d0c11",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-body)",
        padding: "var(--space-4)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background Decorative Grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none"
        }} />
        
        <div style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(18, 16, 26, 0.6)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-8)",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(167, 139, 250, 0.05)",
          zIndex: 10
        }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "var(--space-6)" }}>
            <img src="/icon-192x192.png" alt="CyneMora Logo" width={44} height={44} style={{ borderRadius: "10px", boxShadow: "0 8px 16px rgba(167, 139, 250, 0.2)" }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: "800", letterSpacing: "var(--tracking-tight)" }}>CyneMora</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: "800", marginBottom: "var(--space-3)", letterSpacing: "var(--tracking-tight)" }}>Verify Your Email</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "var(--space-6)" }}>
            We've sent a verification link to your email. Please click the link in that email to activate your account and start directing cinema-quality videos.
          </p>

          {/* Email badge */}
          <div style={{
            background: "rgba(167, 139, 250, 0.06)",
            border: "1px solid rgba(167, 139, 250, 0.15)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            fontSize: "14px",
            fontFamily: "var(--font-mono)",
            fontWeight: "600",
            color: "var(--color-primary-light)",
            marginBottom: "var(--space-6)",
            wordBreak: "break-all"
          }}>
            {user.email}
          </div>

          {statusMessage && (
            <div style={{
              fontSize: "13px",
              color: statusMessage.includes("Failed") ? "var(--color-error)" : "var(--color-primary-light)",
              background: statusMessage.includes("Failed") ? "rgba(248, 113, 113, 0.08)" : "rgba(167, 139, 250, 0.08)",
              border: `1px solid ${statusMessage.includes("Failed") ? "rgba(248, 113, 113, 0.2)" : "rgba(167, 139, 250, 0.2)"}`,
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-6)",
              lineHeight: "1.4"
            }}>
              {statusMessage}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <button
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "var(--space-3)",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {refreshing ? (
                <>
                  <div style={{ width: "16px", height: "16px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  Checking Status...
                </>
              ) : (
                "⚡ Check Verification Status"
              )}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={resending || cooldown > 0}
              className="btn btn-secondary"
              style={{
                width: "100%",
                padding: "var(--space-3)",
                fontSize: "14px",
                fontWeight: "600",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: cooldown > 0 ? "var(--color-text-muted)" : "var(--color-text-primary)"
              }}
            >
              {cooldown > 0 ? `Resend Email in ${cooldown}s` : "📬 Resend Verification Email"}
            </button>

            <button
              onClick={signOut}
              className="btn btn-text"
              style={{
                marginTop: "var(--space-2)",
                fontSize: "13px",
                color: "var(--color-text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userInitial =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "C";

  return (
    <div className={styles.dashLayout}>
      {/* Mobile Toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
        id="sidebar-toggle"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`${styles.mobileOverlay} ${
          sidebarOpen ? styles.mobileOverlayVisible : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${
          sidebarOpen ? styles.sidebarOpen : ""
        }`}
      >
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <img src="/icon-192x192.png" alt="CyneMora Logo" width={32} height={32} style={{ borderRadius: '8px', marginRight: '8px' }} />
          <span className={styles.sidebarBrand}>CyneMora</span>
        </div>

        {/* Navigation */}
        <nav className={styles.sidebarNav}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className={styles.navSection}>
              <div className={styles.navSectionLabel}>{section.label}</div>
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${
                      isActive ? styles.navItemActive : ""
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer — User Card */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  referrerPolicy="no-referrer"
                />
              ) : (
                userInitial
              )}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {user?.displayName || "Director"}
              </div>
              <div className={styles.userEmail}>
                {user?.email || ""}
              </div>
            </div>
            <button
              className={styles.signOutBtn}
              onClick={signOut}
              title="Sign out"
              id="signout-btn"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>{children}</main>

      {/* Dynamic Trial Expired Motivational wall */}
      <TrialCompletionModal
        isOpen={isTrialExpiredModalOpen}
        onClose={() => setIsTrialExpiredModalOpen(false)}
      />
    </div>
  );
}
