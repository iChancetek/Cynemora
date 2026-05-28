/* ========================================
   CyneMora — Dashboard Home
   Unified, Direct Cinematic-style Video Generation
   Simple, Easy, Premium
   ======================================== */

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./flow/flow.module.css";
import dashStyles from "./dashboard.module.css";

interface FlowVideo {
  id?: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  movement: string;
  videoUrl: string;
  createdAt: any;
  deletedAt?: string;
}



const PRESETS = [
  { name: "Cinematic", promptAppend: "dark moody lighting, cinematic composition, award-winning cinematography, hyper-realistic, shot on 35mm" },
  { name: "Cyberpunk", promptAppend: "rain-slicked neon street, wet reflections, pink and cyan hues, blade runner style" },
  { name: "Sci-Fi", promptAppend: "futuristic cosmic setting, vibrant nebulas, high-tech spaceship interior, photorealistic" },
  { name: "Noir Film", promptAppend: "high-contrast black and white, rain shadows, retro cinematic composition, dramatic silhouettes" }
];

function VideoThumbnail({ src, className }: { src: string, className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src || !canvasRef.current) return;

    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.src = src;

    const onDataLoaded = () => {
      v.currentTime = 0.5;
    };

    const onSeeked = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = v.videoWidth || 640;
      c.height = v.videoHeight || 360;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(v, 0, 0, c.width, c.height);
        setIsLoaded(true);
      }
      cleanup();
    };

    const onError = () => {
      setHasError(true);
      cleanup();
    };

    const cleanup = () => {
      v.removeAttribute("src");
      v.load();
    };

    v.addEventListener("loadeddata", onDataLoaded);
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("loadeddata", onDataLoaded);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("error", onError);
      cleanup();
    };
  }, [src]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: isLoaded ? 'block' : 'none' }} 
      />
      {!isLoaded && !hasError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {hasError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '24px', opacity: 0.5 }}>🎬</span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("4");
  const [cameraMovement, setCameraMovement] = useState("pan");
  const [movementSpeed, setMovementSpeed] = useState("slow");
  
  const [rendering, setRendering] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [history, setHistory] = useState<FlowVideo[]>([]);
  const [logText, setLogText] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  
  const greeting = getGreeting();
  const firstName = user?.displayName?.split(" ")[0] || "Creator";

  // Load history from Firestore
  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "renders"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const items: FlowVideo[] = [];
        
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.videoUrl && !d.deletedAt) {
            items.push({
              id: docSnap.id,
              prompt: d.prompt || "",
              style: d.style || "custom",
              aspectRatio: d.aspectRatio || "16:9",
              movement: d.movement || "static",
              videoUrl: d.videoUrl,
              createdAt: d.createdAt?.toDate() || new Date()
            });
          }
        });
        items.sort((a, b) => {
          const timeA = a.createdAt?.getTime() || 0;
          const timeB = b.createdAt?.getTime() || 0;
          return timeB - timeA;
        });
        
        setHistory(items);
        if (items.length > 0) {
          setActiveVideoUrl(items[0].videoUrl);
        }
      } catch (err) {
        console.warn("Firestore collection 'renders' query failed or restricted, reading from local state persistence:", (err as Error).message);
        const localData = localStorage.getItem(`renders_${user.uid}`);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            const formatted = parsed.filter((item: any) => !item.deletedAt).map((item: any) => ({
              ...item,
              createdAt: new Date(item.createdAt)
            }));
            setHistory(formatted);
            if (formatted.length > 0) {
              setActiveVideoUrl(formatted[0].videoUrl);
            }
          } catch (e) {
            setHistory([]);
          }
        } else {
          setHistory([]);
        }
      }
    }
    
    loadHistory();
  }, [user]);

  // Append preset values
  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    if (selectedStyle === preset.name) {
      setSelectedStyle("");
      setPrompt((prev) => prev.replace(`, ${preset.promptAppend}`, ""));
    } else {
      setSelectedStyle(preset.name);
      setPrompt((prev) => {
        let cleanPrompt = prev;
        PRESETS.forEach((p) => {
          cleanPrompt = cleanPrompt.replace(`, ${p.promptAppend}`, "");
        });
        return `${cleanPrompt.trim()}, ${preset.promptAppend}`;
      });
    }
  };

  // Submit flow render
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setRendering(true);
    setActiveStep(1);
    setLogText("Compiling cinematic prompt directives...");
    
    try {
      // 1. Submit render request to API
      const res = await fetch("/api/render/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          duration: parseInt(duration),
          provider: "veo-3.1-lite-generate-preview"
        })
      });
      
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || "Failed to submit render request");
      }
      
      const resData = await res.json();
      const operation = resData.operation;
      
      if (!operation || !operation.id) {
        throw new Error("No operation received from render API");
      }
      
      const operationId = operation.id;
      const provider = operation.provider;
      
      setActiveStep(2);
      setLogText("GPU cluster container slot allocated. Beginning progressive render...");
      
      // 2. Poll render status until complete or failed
      let isDone = false;
      let completedVideoUrl = "";
      let attempts = 0;
      const maxAttempts = 40; // 40 attempts * 3 seconds = 120 seconds max timeout
      
      while (!isDone && attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        const statusRes = await fetch(`/api/render/status?operationId=${encodeURIComponent(operationId)}&provider=${encodeURIComponent(provider)}`);
        if (!statusRes.ok) continue;
        
        const statusData = await statusRes.json();
        const opStatus = statusData.operation;
        
        if (opStatus) {
          if (opStatus.status === "completed") {
            completedVideoUrl = opStatus.videoUrl || "";
            isDone = true;
          } else if (opStatus.status === "failed") {
            throw new Error("CyneMora 3.5 rendering pipeline failed");
          } else {
            // Update progress steps dynamically in real time
            const progress = opStatus.progress || 50;
            if (progress >= 75) {
              setActiveStep(4);
              setLogText("CyneMora 3.5 frame serialization complete. Caching and syncing to Firebase Storage...");
            } else {
              setActiveStep(3);
              setLogText(`CyneMora 3.5 generating cinematic sequences (${progress}% complete)...`);
            }
          }
        }
      }
      
      if (!isDone) {
        throw new Error("Render timed out on the GPU cluster");
      }
      
      if (!completedVideoUrl) {
        throw new Error("Rendering complete, but no video URI returned by provider");
      }

      if (videoRef.current) {
        videoRef.current.src = completedVideoUrl;
        videoRef.current.load();
      }

      setActiveVideoUrl(completedVideoUrl);

      // 4. Save metadata to Firestore database
      let docId = `render_${Date.now()}`;
      const newHistoryItem = {
        id: docId,
        prompt,
        style: selectedStyle || "custom",
        aspectRatio,
        movement: `${cameraMovement} (${movementSpeed})`,
        videoUrl: completedVideoUrl,
        createdAt: new Date()
      };

      try {
        if (user) {
          const docRef = await addDoc(collection(db, "renders"), {
            userId: user.uid,
            prompt,
            style: selectedStyle || "custom",
            aspectRatio,
            movement: `${cameraMovement} (${movementSpeed})`,
            videoUrl: completedVideoUrl,
            createdAt: new Date(),
            status: "completed"
          });
          docId = docRef.id;
          newHistoryItem.id = docId;
        }
      } catch (saveErr) {
        console.warn("Could not save render metadata to Firestore due to rule restrictions, utilizing local storage persistence:", (saveErr as Error).message);
      }

      setHistory((prev) => {
        const updated = [newHistoryItem, ...prev];
        if (user) {
          localStorage.setItem(`renders_${user.uid}`, JSON.stringify(updated));
        }
        return updated;
      });
      setLogText("Render successful! Playing now...");
    } catch (err) {
      console.error("[Generation Fail]", err);
      alert(`Render Generation failed: ${(err as Error).message}`);
    } finally {
      setRendering(false);
      setActiveStep(0);
    }
  };

  return (
    <div>
      {/* Header greeting */}
      <div className={dashStyles.dashHeader} style={{ marginBottom: "var(--space-6)" }}>
        <h1 className={dashStyles.dashGreeting}>
          {greeting}, <span className="text-gradient">{firstName}</span>
        </h1>
        <p className={dashStyles.dashSubtitle}>
          Direct Text-to-Video Creator. Simple, fast, high-performance cinema rendering.
        </p>
      </div>

      {/* Main CyneMora Workspace */}
      <div className={styles.flowPage}>
        {/* Controls */}
        <div className={styles.controlsPanel}>
          <div>
            <h2 className={styles.panelTitle}>Video Parameters</h2>
            <p className={styles.panelDesc}>Configure prompt directives and camera movements.</p>
          </div>

          {/* Prompt */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Direct Video Prompt</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe your scene in natural language..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={rendering}
            />
          </div>

          {/* Style Moods */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Preset Style Filters</label>
            <div className={styles.presetsGrid}>
              {PRESETS.map((preset) => (
                <span
                  key={preset.name}
                  className={`${styles.presetChip} ${
                    selectedStyle === preset.name ? styles.presetChipActive : ""
                  }`}
                  onClick={() => !rendering && handlePresetSelect(preset)}
                >
                  {preset.name}
                </span>
              ))}
            </div>
          </div>

          {/* Settings grid */}
          <div className={styles.selectGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Ratio</label>
              <select
                className={styles.select}
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={rendering}
              >
                <option value="16:9">16:9 Wide</option>
                <option value="9:16">9:16 Portrait</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Camera Move</label>
              <select
                className={styles.select}
                value={cameraMovement}
                onChange={(e) => setCameraMovement(e.target.value)}
                disabled={rendering}
              >
                <option value="pan">Pan Left/Right</option>
                <option value="tilt">Tilt Up/Down</option>
                <option value="zoom">Zoom In/Out</option>
                <option value="dolly">Dolly Push</option>
                <option value="static">Static Camera</option>
              </select>
            </div>
          </div>

          {/* Action trigger */}
          <button
            className="btn btn-primary btn-lg generateBtn"
            onClick={handleGenerate}
            disabled={rendering || !prompt.trim()}
            id="dashboard-generate-btn"
          >
            {rendering ? "Generating Video..." : "⚡ Render Video"}
          </button>
        </div>

        {/* Theater display panel */}
        <div className={styles.outputArea}>
          <div className={styles.theaterBox}>
            {activeVideoUrl ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <video
                  ref={videoRef}
                  className={styles.theaterVideo}
                  src={activeVideoUrl}
                  controls
                  loop
                  autoPlay
                />
                <div style={{
                  position: 'absolute',
                  bottom: '60px', /* Above controls */
                  right: '20px',
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '4px',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 10,
                  textTransform: 'uppercase'
                }}>
                  <img src="/icon-192x192.png" alt="" width={14} height={14} style={{ borderRadius: '2px', opacity: 0.8 }} />
                  CyneMora
                </div>
              </div>
            ) : (
              <div className={styles.theaterPlaceholder}>
                <div className={styles.theaterPlaceholderIcon}>🎥</div>
                <div className={styles.theaterPlaceholderText}>
                  Type a visual prompt to start your high-speed render flow.
                </div>
              </div>
            )}
          </div>

          {/* Flow status */}
          {(rendering || activeStep > 0) && (
            <div className={styles.statusFlowCard}>
              <div className={styles.flowHeader}>
                <span className={styles.flowTitle}>CyneMora Workspace</span>
                <span style={{ fontSize: "var(--text-xs)", opacity: 0.6 }}>{logText}</span>
              </div>
              <div className={styles.flowSteps}>
                {[
                  { label: "Compile", num: 1 },
                  { label: "GPU Queue", num: 2 },
                  { label: "Render", num: 3 },
                  { label: "Store", num: 4 }
                ].map((step) => {
                  const isDone = activeStep > step.num || (activeStep === 4 && step.num === 4);
                  const isCurrent = activeStep === step.num;
                  return (
                    <div key={step.num} className={styles.flowStep}>
                      <div
                        className={`${styles.stepIcon} ${
                          isCurrent ? styles.stepIconActive : ""
                        } ${isDone ? styles.stepIconCompleted : ""}`}
                      >
                        {isDone ? "✓" : step.num}
                      </div>
                      <span
                        className={`${styles.stepLabel} ${
                          isCurrent ? styles.stepLabelActive : ""
                        } ${isDone ? styles.stepLabelCompleted : ""}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gallery history */}
          {history.length > 0 && (
            <div className={styles.historySection} style={{ marginTop: "var(--space-2)" }}>
              <h3 className={styles.historyTitle}>Visual Generation History</h3>
              <div className={styles.historyGrid}>
                {history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={styles.historyCard}
                    onClick={() => {
                      setActiveVideoUrl(item.videoUrl);
                      setTimeout(() => {
                        if (videoRef.current) {
                          videoRef.current.load();
                          videoRef.current.play().catch(e => console.warn("Autoplay prevented:", e));
                        }
                      }, 50);
                    }}
                  >
                    <div className={styles.historyThumb}>
                      <VideoThumbnail src={item.videoUrl} className={styles.historyThumbVideo} />
                    </div>
                    <div className={styles.historyBody}>
                      <p className={styles.historyPrompt}>{item.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
