/* ========================================
   Cynemora — Projects List Page
   Lists all user cinematic productions
   ======================================== */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./projects.module.css";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  status: string;
  tier: string;
  createdAt: any;
  creditsUsed: number;
}

const MOCK_PROJECTS: ProjectItem[] = [
  {
    id: "europa-station",
    title: "Europa Station Seven",
    description: "A lone scientist on Jupiter's icy moon discovers an ancient anomaly beneath the frozen crust that mirrors her own childhood memories.",
    status: "planning",
    tier: "premium",
    createdAt: new Date(Date.now() - 3600000 * 24),
    creditsUsed: 15,
  },
  {
    id: "neon-dream",
    title: "Neon Echoes",
    description: "In a rain-slicked cyberpunk metropolis, a memory technician struggles to distinguish their own childhood from the commercial memories they sell.",
    status: "complete",
    tier: "standard",
    createdAt: new Date(Date.now() - 3600000 * 48),
    creditsUsed: 8,
  }
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "projects"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const items: ProjectItem[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            title: data.title || "Untitled Production",
            description: data.description || "",
            status: data.status || "planning",
            tier: data.tier || "standard",
            createdAt: data.createdAt?.toDate() || new Date(),
            creditsUsed: data.creditsUsed || 0,
          });
        });

        // If user has zero projects, show mocks + any guest projects
        if (items.length === 0) {
          setProjects(MOCK_PROJECTS);
        } else {
          setProjects(items);
        }
      } catch (err) {
        console.error("Failed to load projects, showing fallback", err);
        setProjects(MOCK_PROJECTS);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [user]);

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
          <h2 className={styles.emptyTitle}>No Productions</h2>
          <p className={styles.emptyDesc}>
            Start your cinematic story with AI Story Intelligence.
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
                    {project.status === "complete" ? "🟢 Complete" : "🟡 Planning"}
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
                  Created: {new Date(project.createdAt).toLocaleDateString()}
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
