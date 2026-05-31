/* ========================================
   CyneMora — Admin Command Center Layout
   Admin-only access with premium sidebar
   ======================================== */

"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./admin.module.css";

const PLATFORM_ADMINS = ["chancellor@ichancetek.com", "chanceminus@gmail.com"];

const ADMIN_NAV = [
  {
    label: "Command Center",
    items: [
      { icon: "🎯", label: "Overview", href: "/admin" },
      { icon: "👥", label: "Users", href: "/admin/users" },
      { icon: "🎥", label: "Video Archive", href: "/admin/renders" },
      { icon: "🤖", label: "AI Operations", href: "/admin/ai-ops" },
    ],
  },
  {
    label: "Platform",
    items: [
      { icon: "🎬", label: "User Dashboard", href: "/dashboard" },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = user?.email
    ? PLATFORM_ADMINS.includes(user.email.toLowerCase())
    : false;

  // Block non-admin users
  if (user && !isAdmin) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#0d0c11", color: "var(--color-text-primary)",
        fontFamily: "var(--font-body)", textAlign: "center", padding: "var(--space-8)"
      }}>
        <div>
          <div style={{ fontSize: "48px", marginBottom: "var(--space-4)" }}>🔒</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 800, marginBottom: "var(--space-3)" }}>Access Restricted</h1>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            The Admin Command Center is restricted to authorized platform administrators.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/dashboard")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!user) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#0d0c11"
      }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid var(--color-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const userInitial = user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "A";

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={styles.adminSidebar}>
        <div className={styles.adminSidebarHeader}>
          <img src="/icon-192x192.png" alt="CyneMora" width={28} height={28} style={{ borderRadius: "7px" }} />
          <span className={styles.adminBrand}>CyneMora</span>
          <span className={styles.adminBadge}>Admin</span>
        </div>

        <nav className={styles.adminNav}>
          {ADMIN_NAV.map((section) => (
            <div key={section.label} className={styles.adminNavSection}>
              <div className={styles.adminNavLabel}>{section.label}</div>
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.adminNavItem} ${isActive ? styles.adminNavItemActive : ""}`}
                  >
                    <span className={styles.adminNavIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.adminSidebarFooter}>
          <div className={styles.adminUserCard}>
            <div className={styles.adminUserAvatar}>
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "Admin"} referrerPolicy="no-referrer" />
              ) : userInitial}
            </div>
            <div className={styles.adminUserInfo}>
              <div className={styles.adminUserName}>{user.displayName || "Administrator"}</div>
              <div className={styles.adminUserRole}>Platform Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.adminMain}>{children}</main>
    </div>
  );
}
