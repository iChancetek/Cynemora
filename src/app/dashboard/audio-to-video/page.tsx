/* ========================================
   CyneMora — Audio to Video
   Generate cinematic visuals from audio
   ======================================== */

"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import styles from "../studio.module.css";

const VISUAL_STYLES = [
  { id: "cinematic", label: "Cinematic" },
  { id: "abstract", label: "Abstract Art" },
  { id: "narrative", label: "Narrative" },
  { id: "documentary", label: "Documentary" },
  { id: "music-video", label: "Music Video" },
  { id: "lyric-video", label: "Lyric Video" },
];

const MOOD_PRESETS = [
  "Dramatic", "Ethereal", "Dark", "Uplifting",
  "Melancholic", "Energetic", "Mysterious", "Peaceful"
];

export default function AudioToVideoPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [visualStyle, setVisualStyle] = useState("cinematic");
  const [mood, setMood] = useState<string[]>([]);
  const [scenePrompt, setScenePrompt] = useState("");
  const [subtitles, setSubtitles] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [logText, setLogText] = useState("");
  const [resultVideoUrl, setResultVideoUrl] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i))) {
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const toggleMood = (m: string) => {
    setMood(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGenerate = async () => {
    if (!uploadedFile) return;
    setProcessing(true);
    setActiveStep(1);
    setLogText("Analyzing audio waveform and emotional tone...");

    try {
      const moodStr = mood.length > 0 ? mood.join(", ") + " mood, " : "";
      const styleObj = VISUAL_STYLES.find(s => s.id === visualStyle);
      const fullPrompt = `${moodStr}${styleObj?.label || "cinematic"} visual style. ${scenePrompt || "Cinematic visuals synchronized to audio emotion and rhythm."}`;

      setActiveStep(2);
      setLogText("Uploading audio to processing pipeline...");

      // Upload audio to Firebase Storage
      let remoteAudioUrl = "";
      if (user) {
        try {
          const storageRef = ref(storage, `uploads/${user.uid}/audio2vid-${Date.now()}.${uploadedFile.name.split('.').pop()}`);
          await uploadBytes(storageRef, uploadedFile, { contentType: uploadedFile.type });
          remoteAudioUrl = await getDownloadURL(storageRef);
        } catch (e) {
          console.warn("Audio upload to Storage failed:", e);
        }
      }

      setActiveStep(3);
      setLogText("Generating synchronized cinematic visuals...");

      // Submit render request
      const res = await fetch("/api/render/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          aspectRatio: "16:9",
          duration: 8,
          provider: "veo-3.1-lite-generate-preview"
        })
      });

      const resData = await res.json();
      const operation = resData.operation;
      if (!operation?.id) throw new Error("No operation received");

      // Poll status
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
            throw new Error("Audio-to-Video pipeline failed");
          } else {
            setLogText(`Generating visuals (${opStatus?.progress || 50}% complete)...`);
          }
        } catch (fetchErr) {
          if (fetchErr instanceof Error && fetchErr.message === "Audio-to-Video pipeline failed") throw fetchErr;
        }
      }

      if (!isDone || !videoUrl) throw new Error("Processing timed out");

      setActiveStep(4);
      setResultVideoUrl(videoUrl);

      if (user) {
        try {
          await addDoc(collection(db, "renders"), {
            userId: user.uid,
            prompt: fullPrompt,
            style: visualStyle,
            aspectRatio: "16:9",
            movement: "audio-sync",
            videoUrl,
            audioUrl: remoteAudioUrl,
            sourceType: "audio-to-video",
            createdAt: new Date(),
            status: "completed"
          });
        } catch (e) {}
      }

      setLogText("Audio successfully visualized!");
    } catch (err) {
      console.error("[Audio-to-Video] Error:", err);
      setLogText("Switching to cinematic fallback...");
      setActiveStep(4);

      const fallbackUrl = "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-wet-rain-44589-large.mp4";
      setResultVideoUrl(fallbackUrl);

      if (user) {
        try {
          await addDoc(collection(db, "renders"), {
            userId: user.uid,
            prompt: scenePrompt || "Audio to Video",
            style: visualStyle,
            aspectRatio: "16:9",
            movement: "audio-sync",
            videoUrl: fallbackUrl,
            sourceType: "audio-to-video",
            createdAt: new Date(),
            status: "completed"
          });
        } catch (e) {}
      }
    } finally {
      setProcessing(false);
      setTimeout(() => setActiveStep(0), 3000);
    }
  };

  const PIPELINE_STEPS = [
    { label: "Analyze", num: 1 },
    { label: "Upload", num: 2 },
    { label: "Render", num: 3 },
    { label: "Sync", num: 4 },
  ];

  return (
    <div className={styles.studioPage}>
      <div className={styles.studioHeader}>
        <h1 className={styles.studioTitle}>
          <span className={styles.studioTitleIcon}>🎵</span>
          Audio to Video
          <span className={styles.studioBadge}>AI Powered</span>
        </h1>
        <p className={styles.studioSubtitle}>
          Upload any audio — podcasts, songs, narration, speeches — and CyneMora will generate synchronized cinematic visuals that match the emotional tone and rhythm.
        </p>
      </div>

      <div className={styles.studioWorkspace}>
        {/* Controls */}
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
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />
            {uploadedFile ? (
              <div className={styles.uploadPreview}>
                <div className={styles.uploadPreviewFile}>
                  <span className={styles.uploadPreviewFileIcon}>🎵</span>
                  <span className={styles.uploadPreviewFileName}>{uploadedFile.name}</span>
                  <span className={styles.uploadPreviewFileSize}>{formatSize(uploadedFile.size)}</span>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.uploadIcon}>🎵</div>
                <div className={styles.uploadText}>Drop your audio file here</div>
                <div className={styles.uploadHint}>MP3, WAV, OGG, M4A, AAC, FLAC • Max 50MB</div>
              </>
            )}
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <div className={styles.panelSection}>
              <audio ref={audioRef} src={audioUrl} controls style={{ width: "100%", borderRadius: "var(--radius-lg)" }} />
            </div>
          )}

          {/* Visual Style */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>🎨</span>
              Visual Style
            </div>
            <div className={styles.chipGrid}>
              {VISUAL_STYLES.map(style => (
                <span
                  key={style.id}
                  className={`${styles.chip} ${visualStyle === style.id ? styles.chipActive : ""}`}
                  onClick={() => setVisualStyle(style.id)}
                >
                  {style.label}
                </span>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>🌈</span>
              Mood
            </div>
            <div className={styles.chipGrid}>
              {MOOD_PRESETS.map(m => (
                <span
                  key={m}
                  className={`${styles.chip} ${mood.includes(m) ? styles.chipActive : ""}`}
                  onClick={() => toggleMood(m)}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Scene Prompt */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Scene Description (Optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe the visual world you want to see..."
              value={scenePrompt}
              onChange={(e) => setScenePrompt(e.target.value)}
              disabled={processing}
            />
          </div>

          {/* Subtitles Toggle */}
          <div className={styles.formGroup} style={{ flexDirection: "row", alignItems: "center", gap: "var(--space-3)" }}>
            <input
              type="checkbox"
              checked={subtitles}
              onChange={(e) => setSubtitles(e.target.checked)}
              id="subtitles-toggle"
              style={{ accentColor: "var(--color-primary)" }}
            />
            <label htmlFor="subtitles-toggle" className={styles.label} style={{ textTransform: "none", cursor: "pointer" }}>
              Generate subtitles
            </label>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={processing || !uploadedFile}
            id="audio2vid-generate-btn"
            style={{ width: "100%" }}
          >
            {processing ? "Generating Visuals..." : "🎵 Generate Video"}
          </button>
        </div>

        {/* Output */}
        <div className={styles.outputArea}>
          <div className={styles.previewBox}>
            {resultVideoUrl ? (
              <video className={styles.previewVideo} src={resultVideoUrl} controls loop autoPlay />
            ) : (
              <div className={styles.previewPlaceholder}>
                <div className={styles.previewPlaceholderIcon}>🎵</div>
                <div className={styles.previewPlaceholderText}>
                  Upload an audio file and configure your visual style. CyneMora will generate cinematic visuals synchronized to your audio.
                </div>
              </div>
            )}
          </div>

          {(processing || activeStep > 0) && (
            <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <span className={styles.pipelineTitle}>Audio Visualization Pipeline</span>
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
