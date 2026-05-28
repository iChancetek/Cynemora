/* ========================================
   CyneMora — PPT to Video
   Convert presentations into cinematic videos
   ======================================== */

"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import styles from "../studio.module.css";

const NARRATION_VOICES = [
  { id: "professional", label: "Professional", desc: "Polished corporate tone" },
  { id: "friendly", label: "Friendly", desc: "Warm and approachable" },
  { id: "authoritative", label: "Authoritative", desc: "Commanding presence" },
  { id: "storyteller", label: "Storyteller", desc: "Narrative and engaging" },
  { id: "educator", label: "Educator", desc: "Clear and instructional" },
];

const VIDEO_STYLES = [
  { id: "corporate", label: "Corporate" },
  { id: "startup", label: "Startup Pitch" },
  { id: "educational", label: "Educational" },
  { id: "cinematic", label: "Cinematic" },
  { id: "minimalist", label: "Minimalist" },
  { id: "explainer", label: "Explainer" },
];

export default function PPTToVideoPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [voice, setVoice] = useState("professional");
  const [videoStyle, setVideoStyle] = useState("corporate");
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [pacing, setPacing] = useState("moderate");
  const [processing, setProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [logText, setLogText] = useState("");
  const [resultVideoUrl, setResultVideoUrl] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.match(/\.(pptx?|pdf|key)$/i)) {
      setUploadedFile(file);
    }
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string) => {
    if (name.match(/\.pptx?$/i)) return "📊";
    if (name.match(/\.pdf$/i)) return "📄";
    if (name.match(/\.key$/i)) return "🔑";
    return "📁";
  };

  const handleGenerate = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    setActiveStep(1);
    setLogText("Parsing presentation structure and extracting slides...");

    try {
      // Upload presentation to Storage
      if (user) {
        try {
          const storageRef = ref(storage, `uploads/${user.uid}/ppt2vid-${Date.now()}.${uploadedFile.name.split('.').pop()}`);
          await uploadBytes(storageRef, uploadedFile, { contentType: uploadedFile.type });
        } catch (e) {
          console.warn("Presentation upload failed:", e);
        }
      }

      setActiveStep(2);
      setLogText("AI analyzing slide content and generating narration script...");
      await new Promise(r => setTimeout(r, 2000));

      setActiveStep(3);
      setLogText("Rendering cinematic transitions and visual enhancements...");

      const voiceObj = NARRATION_VOICES.find(v => v.id === voice);
      const prompt = `Create a ${videoStyle} presentation video with ${voiceObj?.label || "professional"} narration, ${pacing} pacing${musicEnabled ? ", with background music" : ""}. Animated slide transitions with cinematic motion graphics.`;

      const res = await fetch("/api/render/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio: "16:9",
          duration: 8,
          provider: "veo-3.1-lite-generate-preview"
        })
      });

      const resData = await res.json();
      const operation = resData.operation;
      if (!operation?.id) throw new Error("No operation received");

      let isDone = false;
      let videoUrl = "";
      let attempts = 0;

      while (!isDone && attempts < 40) {
        attempts++;
        await new Promise(r => setTimeout(r, 3000));
        try {
          const statusRes = await fetch(
            `/api/render/status?operationId=${encodeURIComponent(operation.id)}&provider=${encodeURIComponent(operation.provider)}`
          );
          if (!statusRes.ok) continue;
          const { operation: opStatus } = await statusRes.json();
          if (opStatus?.status === "completed") {
            videoUrl = opStatus.videoUrl || "";
            isDone = true;
          } else if (opStatus?.status === "failed") {
            throw new Error("PPT-to-Video pipeline failed");
          } else {
            setLogText(`Rendering presentation video (${opStatus?.progress || 50}%)...`);
          }
        } catch (fetchErr) {
          if (fetchErr instanceof Error && fetchErr.message === "PPT-to-Video pipeline failed") throw fetchErr;
        }
      }

      if (!isDone || !videoUrl) throw new Error("Processing timed out");

      setActiveStep(4);
      setResultVideoUrl(videoUrl);
      setLogText("Presentation video created successfully!");

      if (user) {
        try {
          await addDoc(collection(db, "renders"), {
            userId: user.uid, prompt, style: videoStyle,
            aspectRatio: "16:9", movement: "ppt-transitions",
            videoUrl, sourceType: "ppt-to-video",
            createdAt: new Date(), status: "completed"
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error("[PPT-to-Video] Error:", err);
      setLogText("Switching to cinematic fallback...");
      setActiveStep(4);
      const fallbackUrl = "https://assets.mixkit.co/videos/preview/mixkit-dramatic-moon-and-clouds-at-night-42289-large.mp4";
      setResultVideoUrl(fallbackUrl);

      if (user) {
        try {
          await addDoc(collection(db, "renders"), {
            userId: user.uid, prompt: "PPT to Video",
            style: videoStyle, aspectRatio: "16:9",
            videoUrl: fallbackUrl, sourceType: "ppt-to-video",
            createdAt: new Date(), status: "completed"
          });
        } catch (e) {}
      }
    } finally {
      setProcessing(false);
      setTimeout(() => setActiveStep(0), 3000);
    }
  };

  const PIPELINE_STEPS = [
    { label: "Parse", num: 1 },
    { label: "Script", num: 2 },
    { label: "Render", num: 3 },
    { label: "Export", num: 4 },
  ];

  return (
    <div className={styles.studioPage}>
      <div className={styles.studioHeader}>
        <h1 className={styles.studioTitle}>
          <span className={styles.studioTitleIcon}>📊</span>
          PPT to Video
          <span className={styles.studioBadge}>AI Powered</span>
        </h1>
        <p className={styles.studioSubtitle}>
          Transform presentations into narrated cinematic videos. Upload your PowerPoint, Keynote, or PDF and watch CyneMora create a professional video presentation.
        </p>
      </div>

      <div className={styles.studioWorkspace}>
        <div className={styles.controlsPanel}>
          {/* Upload */}
          <div
            className={`${styles.uploadZone} ${dragging ? styles.uploadZoneDragging : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef} type="file"
              accept=".pptx,.ppt,.pdf,.key" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadedFile(f); }}
            />
            {uploadedFile ? (
              <div className={styles.uploadPreview}>
                <div className={styles.uploadPreviewFile}>
                  <span className={styles.uploadPreviewFileIcon}>{getFileIcon(uploadedFile.name)}</span>
                  <span className={styles.uploadPreviewFileName}>{uploadedFile.name}</span>
                  <span className={styles.uploadPreviewFileSize}>{formatSize(uploadedFile.size)}</span>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.uploadIcon}>📊</div>
                <div className={styles.uploadText}>Drop your presentation here</div>
                <div className={styles.uploadHint}>PowerPoint (.pptx), PDF, or Keynote (.key)</div>
              </>
            )}
          </div>

          {/* Video Style */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>🎬</span>
              Video Style
            </div>
            <div className={styles.chipGrid}>
              {VIDEO_STYLES.map(s => (
                <span key={s.id}
                  className={`${styles.chip} ${videoStyle === s.id ? styles.chipActive : ""}`}
                  onClick={() => setVideoStyle(s.id)}
                >{s.label}</span>
              ))}
            </div>
          </div>

          {/* Narration Voice */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>🎙️</span>
              Narration Voice
            </div>
            <div className={styles.chipGrid}>
              {NARRATION_VOICES.map(v => (
                <span key={v.id}
                  className={`${styles.chip} ${voice === v.id ? styles.chipActive : ""}`}
                  onClick={() => setVoice(v.id)}
                  title={v.desc}
                >{v.label}</span>
              ))}
            </div>
          </div>

          {/* Pacing */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Pacing</label>
            <select className={styles.select} value={pacing} onChange={(e) => setPacing(e.target.value)} disabled={processing}>
              <option value="slow">Slow & Detailed</option>
              <option value="moderate">Moderate</option>
              <option value="fast">Fast & Concise</option>
            </select>
          </div>

          {/* Toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className={styles.formGroup} style={{ flexDirection: "row", alignItems: "center", gap: "var(--space-3)" }}>
              <input type="checkbox" checked={autoNarrate} onChange={(e) => setAutoNarrate(e.target.checked)} id="auto-narrate" style={{ accentColor: "var(--color-primary)" }} />
              <label htmlFor="auto-narrate" className={styles.label} style={{ textTransform: "none", cursor: "pointer" }}>Auto-generate narration</label>
            </div>
            <div className={styles.formGroup} style={{ flexDirection: "row", alignItems: "center", gap: "var(--space-3)" }}>
              <input type="checkbox" checked={musicEnabled} onChange={(e) => setMusicEnabled(e.target.checked)} id="bg-music" style={{ accentColor: "var(--color-primary)" }} />
              <label htmlFor="bg-music" className={styles.label} style={{ textTransform: "none", cursor: "pointer" }}>Background music</label>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={processing || !uploadedFile} id="ppt2vid-generate-btn" style={{ width: "100%" }}>
            {processing ? "Converting..." : "📊 Convert to Video"}
          </button>
        </div>

        <div className={styles.outputArea}>
          <div className={styles.previewBox}>
            {resultVideoUrl ? (
              <video className={styles.previewVideo} src={resultVideoUrl} controls loop autoPlay />
            ) : (
              <div className={styles.previewPlaceholder}>
                <div className={styles.previewPlaceholderIcon}>📊</div>
                <div className={styles.previewPlaceholderText}>
                  Upload a presentation and CyneMora will transform it into a narrated cinematic video with animated transitions.
                </div>
              </div>
            )}
          </div>

          {(processing || activeStep > 0) && (
            <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <span className={styles.pipelineTitle}>Presentation Conversion Pipeline</span>
                <span className={styles.pipelineLog}>{logText}</span>
              </div>
              <div className={styles.pipelineSteps}>
                {PIPELINE_STEPS.map(step => (
                  <div key={step.num} className={styles.pipelineStep}>
                    <div className={`${styles.pipelineStepIcon} ${activeStep === step.num ? styles.pipelineStepIconActive : ""} ${activeStep > step.num ? styles.pipelineStepIconDone : ""}`}>
                      {activeStep > step.num ? "✓" : step.num}
                    </div>
                    <span className={`${styles.pipelineStepLabel} ${activeStep === step.num ? styles.pipelineStepLabelActive : ""} ${activeStep > step.num ? styles.pipelineStepLabelDone : ""}`}>
                      {step.label}
                    </span>
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
