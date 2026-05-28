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

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    </div>
  );
}
