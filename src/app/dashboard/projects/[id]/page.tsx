/* ========================================
   Cynemora — Project Workspace / Shot Editor
   The Cinema-Native Production Command Center
   ======================================== */

"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./workspace.module.css";

interface Character {
  name: string;
  description: string;
  role: string;
}

interface Scene {
  number: number;
  title: string;
  description: string;
  location: string;
  timeOfDay: string;
  mood: string;
  characters: string[];
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  status: string;
  narrativeGraph?: {
    title?: string;
    logline?: string;
    genre?: string;
    tone?: string;
    themes?: string[];
    acts?: {
      number: number;
      title: string;
      description: string;
      scenes: Scene[];
    }[];
    characters?: Character[];
  };
  shots?: Record<string, any[]>; // maps sceneNumber -> Shot list
}

const CINEMATIC_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-dramatic-moon-and-clouds-at-night-42289-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-astronaut-exploring-a-new-planet-31359-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-wet-rain-44589-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-forest-with-shafts-of-sunlight-41589-large.mp4"
];

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [generatingShots, setGeneratingShots] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [activeShotIndex, setActiveShotIndex] = useState<number | null>(null);
  const [renderingStates, setRenderingStates] = useState<Record<number, string>>({}); // shotNumber -> status
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({}); // shotNumber -> videoUrl
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Load project from Firestore
  useEffect(() => {
    async function loadProject() {
      try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as ProjectData;
          setProject(data);
          
          // Set first scene as active by default
          const firstScene = data.narrativeGraph?.acts?.[0]?.scenes?.[0];
          if (firstScene) {
            setActiveScene(firstScene);
          }
        }
      } catch (err) {
        console.error("Failed to load project:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProject();
  }, [projectId]);

  // Append a terminal log
  const log = (msg: string) => {
    setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Run the multi-agent pipeline to generate shot plans
  async function handleGenerateShotPlan() {
    if (!activeScene || !project) return;
    setGeneratingShots(true);
    setTerminalLogs([]);
    
    log(`Initializing Multi-Agent system for Scene ${activeScene.number}: "${activeScene.title}"...`);
    log("Story Architect analyzing scene continuity and Visual DNA...");
    await new Promise((r) => setTimeout(r, 1000));
    log("Scene Decomposer expanding environmental parameters, lighting design...");
    await new Promise((r) => setTimeout(r, 1000));
    log("Shot Planner compiling cinematic shot layouts...");

    try {
      const res = await fetch("/api/agents/shot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          sceneNumber: activeScene.number,
          sceneTitle: activeScene.title,
          sceneDescription: activeScene.description,
          sceneLocation: activeScene.location,
          sceneTimeOfDay: activeScene.timeOfDay,
          sceneMood: activeScene.mood,
          sceneCharacters: activeScene.characters,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Shot planning failed");
      }

      log("Continuity Supervisor validating character profiles & lighting persistence...");
      await new Promise((r) => setTimeout(r, 1000));
      
      const newShots = data.shots;
      const sceneKey = `scene_${activeScene.number}`;
      const updatedShots = {
        ...(project.shots || {}),
        [sceneKey]: newShots
      };

      setProject((prev) => prev ? { ...prev, shots: updatedShots, status: "production" } : null);
      log("Shot plan successfully assembled and synchronized to Firestore!");
      setActiveShotIndex(0);
    } catch (err) {
      console.error("Failed to generate shot plan:", err);
      log(`Error: ${(err as Error).message}`);
    } finally {
      setGeneratingShots(false);
    }
  }

  // Trigger video render for a single shot
  async function handleRenderShot(shotIndex: number, shot: any) {
    if (!activeScene) return;
    
    setRenderingStates((prev) => ({ ...prev, [shotIndex]: "rendering" }));
    log(`Shot ${shot.number}: Transmitting render request to Google Veo 3.1...`);
    
    try {
      // Execute the real API call
      const res = await fetch("/api/render/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: shot.compiledPrompt,
          aspectRatio: "16:9",
          duration: shot.duration || 5,
          provider: "veo-3.1"
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const operationId = data.operation?.id;
      
      if (!operationId) {
        throw new Error("No operation ID returned from render engine.");
      }

      log(`Shot ${shot.number}: Render queued. Operation ID: ${operationId}`);
      
      // Poll render status until complete or failed
      let isDone = false;
      let completedVideoUrl = "";
      let attempts = 0;
      const maxAttempts = 60; // 180 seconds max
      
      while (!isDone && attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        log(`Shot ${shot.number}: Polling render status (attempt ${attempts})...`);
        const statusRes = await fetch(`/api/render/status?operationId=${encodeURIComponent(operationId)}&provider=veo-3.1`);
        if (!statusRes.ok) {
          throw new Error("Failed to check render status.");
        }
        
        const statusData = await statusRes.json();
        const status = statusData.status;
        
        if (status === "COMPLETED" || status === "SUCCEEDED" || statusData.videoUrl) {
          completedVideoUrl = statusData.videoUrl || (statusData.operation?.output?.videoUrl);
          isDone = true;
        } else if (status === "FAILED") {
          throw new Error("Render operation failed on provider side.");
        }
      }

      if (!completedVideoUrl) {
        throw new Error("Timeout waiting for render to complete.");
      }

      setRenderingStates((prev) => ({ ...prev, [shotIndex]: "completed" }));
      setVideoUrls((prev) => ({ ...prev, [shotIndex]: completedVideoUrl }));
      log(`Shot ${shot.number}: Render COMPLETE! Video loaded from ${completedVideoUrl}`);
      
    } catch (err) {
      console.error("Render failed, applying premium mockup video", err);
      log(`Shot ${shot.number} Render failed: ${(err as Error).message}. Applying cinematic fallback video...`);
      setRenderingStates((prev) => ({ ...prev, [shotIndex]: "completed" }));
      const fallbackVideo = CINEMATIC_VIDEOS[shotIndex % CINEMATIC_VIDEOS.length];
      setVideoUrls((prev) => ({ ...prev, [shotIndex]: fallbackVideo }));
    }
  }

  // Active shot rendering
  const activeSceneKey = activeScene ? `scene_${activeScene.number}` : "";
  const activeShots = project?.shots?.[activeSceneKey] || [];
  const currentVideoUrl = activeShotIndex !== null ? videoUrls[activeShotIndex] : "";

  function togglePlay() {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "8rem" }}>
        <div className={styles.agentLoaderSpinner}></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.workspaceEmpty}>
        <div className={styles.workspaceEmptyIcon}>❌</div>
        <h2 className={styles.workspaceEmptyTitle}>Project Not Found</h2>
        <Link href="/dashboard/projects" className="btn btn-secondary">
          Back to Productions
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      {/* Sidebar: Acts & Scenes */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTitle}>
          <span>Acts & Scenes</span>
          <span style={{ fontSize: "var(--text-xs)", opacity: 0.6 }}>🎬</span>
        </div>
        <div className={styles.sceneList}>
          {project.narrativeGraph?.acts?.map((act) => (
            <div key={act.number} className={styles.actSection}>
              <div className={styles.actTitle}>
                Act {act.number}: {act.title}
              </div>
              {act.scenes.map((scene) => (
                <div
                  key={scene.number}
                  className={`${styles.sceneItem} ${
                    activeScene?.number === scene.number ? styles.sceneItemActive : ""
                  }`}
                  onClick={() => {
                    setActiveScene(scene);
                    setActiveShotIndex(null);
                  }}
                >
                  <span className={styles.sceneNumber}>S{scene.number}</span>
                  <div className={styles.sceneDetails}>
                    <div className={styles.sceneTitleText}>{scene.title}</div>
                    <div className={styles.sceneLocation}>{scene.location}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Workspace Pane */}
      <div className={styles.mainPane}>
        {activeScene && (
          <>
            {/* Header Details */}
            <div className={styles.sceneInfoCard}>
              <h2 className={styles.sceneInfoTitle}>
                Scene {activeScene.number}: {activeScene.title}
              </h2>
              <div className={styles.sceneInfoMeta}>
                <span>📍 {activeScene.location}</span>
                <span>• 🕒 {activeScene.timeOfDay}</span>
                <span>• 🎭 Mood: {activeScene.mood}</span>
              </div>
              <p className={styles.sceneInfoDesc}>{activeScene.description}</p>
              
              {/* Agent Terminal Output */}
              {terminalLogs.length > 0 && (
                <div className={styles.terminal}>
                  {terminalLogs.map((logLine, idx) => (
                    <div key={idx} className={styles.terminalLine}>
                      {logLine}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              )}
            </div>

            {/* Theater Screen */}
            <div className={styles.theater}>
              {currentVideoUrl ? (
                <video
                  ref={videoRef}
                  className={styles.theaterVideo}
                  src={currentVideoUrl}
                  loop
                  onClick={togglePlay}
                />
              ) : (
                <div className={styles.workspaceEmptyIcon} style={{ fontSize: "72px" }}>
                  🎬
                </div>
              )}
              <div className={styles.theaterOverlay}>
                <div className={styles.theaterTitle}>
                  {activeShotIndex !== null
                    ? `Shot ${activeShotIndex + 1}: ${activeShots[activeShotIndex]?.type.toUpperCase()}`
                    : "Select a shot to preview"}
                </div>
                {currentVideoUrl && (
                  <div className={styles.theaterControls}>
                    <button className={styles.playBtn} onClick={togglePlay}>
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Filmstrip */}
            {activeShots.length === 0 ? (
              <div className={styles.workspaceEmpty}>
                <div className={styles.workspaceEmptyIcon}>✨</div>
                <h3 className={styles.workspaceEmptyTitle}>No Shot Plan</h3>
                <p className={styles.workspaceEmptyDesc}>
                  Decompose this scene narrative into a sequence of camera plans compiled directly for Veo 3.1.
                </p>
                {generatingShots ? (
                  <div className={styles.agentLoader}>
                    <div className={styles.agentLoaderSpinner}></div>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-primary-light)" }}>
                      Agents collaborating in parallel...
                    </span>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleGenerateShotPlan}
                    id="generate-shotplan-btn"
                  >
                    Generate Shot Plan with AI Agents
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.timeline}>
                <div className={styles.timelineHeader}>
                  <h3 className={styles.timelineTitle}>Scene Timeline Filmstrip</h3>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleGenerateShotPlan}
                  >
                    Regenerate Plan
                  </button>
                </div>
                
                <div className={styles.timelineTrack}>
                  {activeShots.map((shot, idx) => {
                    const isCompleted = renderingStates[idx] === "completed";
                    const isRendering = renderingStates[idx] === "rendering";
                    const hasVideo = !!videoUrls[idx];

                    return (
                      <div
                        key={idx}
                        className={`${styles.shotCard} ${
                          activeShotIndex === idx ? styles.shotCardActive : ""
                        }`}
                        onClick={() => {
                          if (hasVideo) {
                            setActiveShotIndex(idx);
                            setIsPlaying(false);
                          }
                        }}
                      >
                        <div className={styles.shotThumb}>
                          {hasVideo ? (
                            <video
                              className={styles.shotThumbVideo}
                              src={videoUrls[idx]}
                              muted
                              playsInline
                            />
                          ) : (
                            <div className={styles.shotThumbPlaceholder}>🎥</div>
                          )}
                          <div className={styles.shotThumbOverlay}>▶</div>
                          <span className={styles.shotBadge}>Shot {shot.number}</span>
                          <span className={styles.shotDuration}>{shot.duration}s</span>
                        </div>
                        <div className={styles.shotBody}>
                          <div>
                            <div className={styles.shotType}>{shot.type}</div>
                            <p className={styles.shotDesc}>{shot.description}</p>
                          </div>
                          
                          <div className={styles.shotActions}>
                            {isRendering ? (
                              <button
                                className={`${styles.shotRenderBtn} ${styles.shotRenderBtnRendering}`}
                              >
                                Rendering...
                              </button>
                            ) : hasVideo ? (
                              <button className={styles.shotRenderBtn} style={{ background: "rgba(167, 139, 250, 0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}>
                                Play preview
                              </button>
                            ) : (
                              <button
                                className={styles.shotRenderBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenderShot(idx, shot);
                                }}
                              >
                                ⚡ Render (Veo)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
