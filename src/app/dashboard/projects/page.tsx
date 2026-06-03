/* ========================================
   CyneMora — Projects List Page
   Lists all user cinematic productions
   (Real data only — no mocks)
   ======================================== */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./projects.module.css";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  status: string;
  tier: string;
  createdAt: Date;
  creditsUsed: number;
  genres?: string[];
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: ProjectItem[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            title: data.title || "Untitled Production",
            description: data.description || "",
            status: data.status || "planning",
            tier: data.tier || "standard",
            createdAt: data.createdAt?.toDate?.() || new Date(),
            creditsUsed: data.creditsUsed || 0,
            genres: data.genres || [],
          });
        });

        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setProjects(items);
        setLoading(false);
      },
      (err) => {
        console.error("[Projects] Snapshot error:", err);
        setProjects([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "complete":
      case "completed":
        return "🟢";
      case "rendering":
        return "🔵";
      case "planning":
      default:
        return "🟡";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "complete":
      case "completed":
        return "Complete";
      case "rendering":
        return "Rendering";
      case "planning":
      default:
        return "Planning";
    }
  };

  return (
    <div className={styles.projectsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Productions</h1>
          <p className={styles.pageDesc}>
            Manage and edit your cinema-native productions.
          </p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary btn-md">
          + New Production
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
        </div>
      ) : projects.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎬</div>
          <h2 className={styles.emptyTitle}>No Productions Yet</h2>
          <p className={styles.emptyDesc}>
            Your cinematic journey starts here. Create your first production
            and watch your vision come to life with AI-powered filmmaking.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary btn-lg">
            Create First Production
          </Link>
        </div>
      ) : (
        <div className={styles.projectsGrid}>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className={styles.projectCard}
            >
              <div>
                <div className={styles.projectMeta}>
                  <span className={styles.projectStatus}>
                    {statusIcon(project.status)} {statusLabel(project.status)}
                  </span>
                  <span className={styles.projectTier}>
                    {project.tier}
                  </span>
                </div>
                <div className={styles.projectInfo}>
                  <h3 className={styles.projectTitle}>{project.title}</h3>
                  <p className={styles.projectDesc}>{project.description}</p>
                </div>
              </div>

              <div className={styles.projectFooter}>
                <span>
                  Created: {project.createdAt.toLocaleDateString()}
                </span>
                <span className={styles.footerStat}>
                  💎 {project.creditsUsed} Credits Used
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
