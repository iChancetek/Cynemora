/* ========================================
   CyneMora — Library Page
   Unified asset management: all user-created
   videos, images, podcasts, final cuts
   ======================================== */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import styles from "./library.module.css";

/* ---- Types ---- */
type AssetCategory = "all" | "video" | "image" | "podcast" | "final-cut";

interface LibraryAsset {
  id: string;
  type: AssetCategory;
  title: string;
  url: string;
  thumbnailUrl?: string;
  source: string; // which feature created it
  createdAt: Date;
  provider?: string;
  prompt?: string;
}

/* ---- Filter definitions ---- */
const FILTER_TABS: { id: AssetCategory; label: string; icon: string }[] = [
  { id: "all",       label: "All Assets",  icon: "📦" },
  { id: "video",     label: "Videos",      icon: "🎬" },
  { id: "image",     label: "Images",      icon: "🖼️" },
  { id: "podcast",   label: "Podcasts",    icon: "🎙️" },
  { id: "final-cut", label: "Final Cuts",  icon: "🎞️" },
];

/* ---- Helpers ---- */
function classifyRender(data: Record<string, any>): AssetCategory {
  const title = (data.title || "").toLowerCase();
  const prompt = (data.prompt || "").toLowerCase();
  const provider = (data.provider || "").toLowerCase();
  const type = (data.type || "").toLowerCase();

  // Final cuts from the stitch pipeline
  if (title.includes("final cut") || type === "final-cut" || type === "stitch") {
    return "final-cut";
  }
  // Podcasts
  if (
    title.includes("podcast") ||
    type === "podcast" ||
    provider.includes("podcast")
  ) {
    return "podcast";
  }
  // Default renders are videos
  return "video";
}

function getSourceLabel(data: Record<string, any>): string {
  const provider = (data.provider || "").toLowerCase();
  const type = (data.type || "").toLowerCase();
  const title = (data.title || "").toLowerCase();

  if (type === "stitch" || title.includes("final cut")) return "Movie Studio";
  if (type === "podcast" || title.includes("podcast")) return "Podcast Studio";
  if (provider.includes("avatar")) return "AI Avatars";
  if (type === "dubbing") return "AI Dubbing";
  if (type === "face-swap") return "Face Swap";
  if (type === "translator") return "Translator";
  if (provider.includes("imagen")) return "Image Studio";
  if (provider.includes("veo")) return "Video Generation";
  return "CyneMora";
}

function getBadgeClass(type: AssetCategory): string {
  switch (type) {
    case "video":     return styles.badgeVideo;
    case "image":     return styles.badgeImage;
    case "podcast":   return styles.badgePodcast;
    case "final-cut": return styles.badgeFinalCut;
    default:          return styles.badgeVideo;
  }
}

function getBadgeLabel(type: AssetCategory): string {
  switch (type) {
    case "video":     return "Video";
    case "image":     return "Image";
    case "podcast":   return "Podcast";
    case "final-cut": return "Final Cut";
    default:          return "Asset";
  }
}

/* ========================================
   Component
   ======================================== */
export default function LibraryPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<AssetCategory>("all");
  const [selectedAsset, setSelectedAsset] = useState<LibraryAsset | null>(null);

  /* ---- Fetch all assets from Firestore ---- */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];

    // 1) renders collection — videos, podcasts, final cuts
    const rendersQ = query(
      collection(db, "renders"),
      where("userId", "==", user.uid)
    );

    unsubs.push(
      onSnapshot(
        rendersQ,
        (snapshot) => {
          const renderAssets: LibraryAsset[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            const url = data.videoUrl || data.audioUrl || "";
            if (!url || data.status === "failed") return; // skip failed/empty

            renderAssets.push({
              id: doc.id,
              type: classifyRender(data),
              title:
                data.title ||
                (data.prompt
                  ? data.prompt.length > 50
                    ? data.prompt.substring(0, 50) + "..."
                    : data.prompt
                  : "Cinematic Render"),
              url,
              thumbnailUrl: data.thumbnailUrl || undefined,
              source: getSourceLabel(data),
              createdAt: data.createdAt?.toDate?.() || new Date(),
              provider: data.provider,
              prompt: data.prompt,
            });
          });

          setAssets((prev) => {
            // Merge: keep images, replace renders
            const imageAssets = prev.filter((a) => a.type === "image");
            return [...renderAssets, ...imageAssets].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            );
          });
          setLoading(false);
        },
        (err) => {
          console.warn("[Library] Renders snapshot error:", err);
          setLoading(false);
        }
      )
    );

    // 2) generated_images collection
    const imagesQ = query(
      collection(db, "generated_images"),
      where("userId", "==", user.uid)
    );

    unsubs.push(
      onSnapshot(
        imagesQ,
        (snapshot) => {
          const imageAssets: LibraryAsset[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            const url = data.imageUrl || data.url || "";
            if (!url) return;

            imageAssets.push({
              id: doc.id,
              type: "image" as AssetCategory,
              title: data.title || data.prompt?.substring(0, 50) || "AI Image",
              url,
              thumbnailUrl: url,
              source: "Image Studio",
              createdAt: data.createdAt?.toDate?.() || new Date(),
              provider: data.provider || "Imagen",
              prompt: data.prompt,
            });
          });

          setAssets((prev) => {
            // Merge: keep non-images, replace images
            const nonImageAssets = prev.filter((a) => a.type !== "image");
            return [...nonImageAssets, ...imageAssets].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
            );
          });
        },
        (err) => {
          console.warn("[Library] Images snapshot error:", err);
        }
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [user]);

  /* ---- Derived data ---- */
  const filteredAssets =
    activeFilter === "all"
      ? assets
      : assets.filter((a) => a.type === activeFilter);

  const counts: Record<AssetCategory, number> = {
    all: assets.length,
    video: assets.filter((a) => a.type === "video").length,
    image: assets.filter((a) => a.type === "image").length,
    podcast: assets.filter((a) => a.type === "podcast").length,
    "final-cut": assets.filter((a) => a.type === "final-cut").length,
  };

  /* ---- Download helper ---- */
  const handleDownload = useCallback((asset: LibraryAsset) => {
    const a = document.createElement("a");
    a.href = asset.url;
    a.download = `${asset.title.replace(/[^a-zA-Z0-9]/g, "_")}.${asset.type === "image" ? "png" : "mp4"}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  /* ---- Render ---- */
  return (
    <div className={styles.libraryPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            Asset <span className="text-gradient">Library</span>
          </h1>
          <p className={styles.pageDesc}>
            All your videos, images, podcasts, and final cuts in one place.
          </p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.headerStat}>
            <div className={styles.headerStatValue}>{counts.video + counts["final-cut"]}</div>
            <div className={styles.headerStatLabel}>Videos</div>
          </div>
          <div className={styles.headerStat}>
            <div className={styles.headerStatValue}>{counts.image}</div>
            <div className={styles.headerStatLabel}>Images</div>
          </div>
          <div className={styles.headerStat}>
            <div className={styles.headerStatValue}>{counts.podcast}</div>
            <div className={styles.headerStatLabel}>Podcasts</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterBar}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.filterTab} ${activeFilter === tab.id ? styles.filterTabActive : ""}`}
            onClick={() => setActiveFilter(tab.id)}
            id={`filter-${tab.id}`}
          >
            {tab.icon} {tab.label}
            <span className={styles.filterCount}>{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonThumb} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            {activeFilter === "all" ? "📚" : FILTER_TABS.find((t) => t.id === activeFilter)?.icon || "📦"}
          </div>
          <h2 className={styles.emptyTitle}>
            {activeFilter === "all" ? "Your Library is Empty" : `No ${getBadgeLabel(activeFilter)}s Yet`}
          </h2>
          <p className={styles.emptyDesc}>
            {activeFilter === "all"
              ? "Start creating videos, images, and podcasts — they'll all appear here."
              : `Create your first ${getBadgeLabel(activeFilter).toLowerCase()} and it will appear here.`}
          </p>
          <Link href="/dashboard/flow" className="btn btn-primary btn-lg">
            Start Creating
          </Link>
        </div>
      ) : (
        <div className={styles.assetGrid}>
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className={styles.assetCard}
              onClick={() => setSelectedAsset(asset)}
            >
              {/* Thumbnail */}
              <div className={styles.assetThumb}>
                {asset.type === "image" && asset.url ? (
                  <img src={asset.url} alt={asset.title} loading="lazy" />
                ) : asset.thumbnailUrl ? (
                  <img src={asset.thumbnailUrl} alt={asset.title} loading="lazy" />
                ) : asset.type === "video" || asset.type === "final-cut" ? (
                  <video src={asset.url} muted playsInline preload="metadata" className={styles.thumbVideoPreview} />
                ) : (
                  <div className={styles.assetThumbIcon}>
                    {asset.type === "podcast" ? "🎙️" : "📦"}
                  </div>
                )}
                {asset.type !== "image" && (
                  <div className={styles.assetPlayOverlay}>
                    <div className={styles.assetPlayBtn}>▶</div>
                  </div>
                )}
                <span className={`${styles.assetTypeBadge} ${getBadgeClass(asset.type)}`}>
                  {getBadgeLabel(asset.type)}
                </span>
              </div>

              {/* Body */}
              <div className={styles.assetBody}>
                <div className={styles.assetTitle}>{asset.title}</div>
                <div className={styles.assetMeta}>
                  <span className={styles.assetSource}>
                    {asset.source}
                  </span>
                  <span>{asset.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player/Lightbox Modal */}
      {selectedAsset && (
        <div
          className={styles.playerOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAsset(null);
          }}
        >
          <div className={styles.playerModal}>
            <div className={styles.playerHeader}>
              <h3 className={styles.playerTitle}>{selectedAsset.title}</h3>
              <button
                className={styles.playerCloseBtn}
                onClick={() => setSelectedAsset(null)}
                id="player-close-btn"
              >
                ✕
              </button>
            </div>

            <div className={styles.playerBody}>
              {selectedAsset.type === "image" ? (
                <img src={selectedAsset.url} alt={selectedAsset.title} />
              ) : (
                <video
                  src={selectedAsset.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              )}
            </div>

            <div className={styles.playerFooter}>
              <div className={styles.playerMetaRow}>
                <span>
                  <strong>Source:</strong> {selectedAsset.source}
                </span>
                {selectedAsset.provider && (
                  <span>
                    <strong>Model:</strong> {selectedAsset.provider}
                  </span>
                )}
                <span>
                  <strong>Created:</strong>{" "}
                  {selectedAsset.createdAt.toLocaleDateString()}
                </span>
              </div>
              <div className={styles.playerActions}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownload(selectedAsset)}
                  id="download-asset-btn"
                >
                  ⬇ Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
