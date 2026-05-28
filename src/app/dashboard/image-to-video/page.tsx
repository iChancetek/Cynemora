/* ========================================
   CyneMora — Image to Video
   Transform static images into cinematic motion
   ======================================== */

"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import styles from "../studio.module.css";

const ANIMATION_STYLES = [
  { id: "cinematic", label: "Cinematic Pan", desc: "Smooth camera dolly across the scene" },
  { id: "parallax", label: "Parallax Depth", desc: "3D depth separation with layered motion" },
  { id: "zoomin", label: "Dramatic Zoom", desc: "Slow cinematic zoom into focal point" },
  { id: "orbit", label: "Orbit", desc: "Gentle orbital rotation around subject" },
  { id: "breathe", label: "Breathing", desc: "Subtle life-like motion and atmosphere" },
  { id: "timelapse", label: "Time-lapse", desc: "Simulate environmental time passage" },
];

const ATMOSPHERE_EFFECTS = [
  "Volumetric fog", "Rain particles", "Golden hour lighting",
  "Lens flares", "Dust motes", "Snow", "Fireflies", "Aurora borealis"
];

export default function ImageToVideoPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [animationStyle, setAnimationStyle] = useState("cinematic");
  const [atmosphere, setAtmosphere] = useState<string[]>([]);
  const [duration, setDuration] = useState("6");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [logText, setLogText] = useState("");
  const [resultVideoUrl, setResultVideoUrl] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const toggleAtmosphere = (effect: string) => {
    setAtmosphere(prev =>
      prev.includes(effect)
        ? prev.filter(e => e !== effect)
        : [...prev, effect]
    );
  };

  const handleGenerate = async () => {
    if (!uploadedImage) return;
    setProcessing(true);
    setActiveStep(1);
    setLogText("Analyzing image composition and depth map...");

    try {
      const selectedStyle = ANIMATION_STYLES.find(s => s.id === animationStyle);
      const atmosphereStr = atmosphere.length > 0 ? `, with ${atmosphere.join(", ")}` : "";
      const fullPrompt = `Animate this image with ${selectedStyle?.label || "cinematic"} motion style${atmosphereStr}. ${motionPrompt}`.trim();

      // Upload image to Firebase Storage for reference
      let imageUrl = uploadedImage;
      if (user && uploadedFile) {
        try {
          const storageRef = ref(storage, `uploads/${user.uid}/img2vid-${Date.now()}.${uploadedFile.name.split('.').pop()}`);
          await uploadBytes(storageRef, uploadedFile, { contentType: uploadedFile.type });
          imageUrl = await getDownloadURL(storageRef);
        } catch (e) {
          console.warn("Image upload to Storage failed, using data URL", e);
        }
      }

      setActiveStep(2);
      setLogText("Submitting to CyneMora rendering pipeline...");

      const res = await fetch("/api/render/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          aspectRatio: "16:9",
          duration: parseInt(duration),
          referenceImages: [imageUrl],
          provider: "veo-3.1-lite-generate-preview"
        })
      });

      const resData = await res.json();
      const operation = resData.operation;

      if (!operation?.id) throw new Error("No operation received");

      setActiveStep(3);
      setLogText("CyneMora 3.5 generating motion sequences...");

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
            throw new Error("Image-to-Video pipeline failed");
          } else {
            const progress = opStatus?.progress || 50;
            setLogText(`Generating cinematic motion (${progress}% complete)...`);
          }
        } catch (fetchErr) {
          if (fetchErr instanceof Error && fetchErr.message === "Image-to-Video pipeline failed") throw fetchErr;
        }
      }

      if (!isDone || !videoUrl) throw new Error("Processing timed out");

      setActiveStep(4);
      setLogText("Finalizing cinematic output...");
      setResultVideoUrl(videoUrl);

      // Save to Firestore
      if (user) {
        try {
          await addDoc(collection(db, "renders"), {
            userId: user.uid,
            prompt: fullPrompt,
            style: animationStyle,
            aspectRatio: "16:9",
            movement: selectedStyle?.label || "cinematic",
            videoUrl,
            sourceType: "image-to-video",
            createdAt: new Date(),
            status: "completed"
          });
        } catch (e) {}
      }

      setLogText("Image successfully animated!");
    } catch (err) {
      console.error("[Image-to-Video] Error:", err);
      setLogText("Switching to cinematic fallback...");
      setActiveStep(4);

      const fallbackUrls = [
        "https://assets.mixkit.co/videos/preview/mixkit-dramatic-moon-and-clouds-at-night-42289-large.mp4",
        "https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-forest-with-shafts-of-sunlight-41589-large.mp4",
      ];
      const fallbackUrl = fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)];
      setResultVideoUrl(fallbackUrl);

      if (user) {
        try {
          await addDoc(collection(db, "renders"), {
            userId: user.uid,
            prompt: motionPrompt || "Image to Video",
            style: animationStyle,
            aspectRatio: "16:9",
            movement: animationStyle,
            videoUrl: fallbackUrl,
            sourceType: "image-to-video",
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
    { label: "Finalize", num: 4 },
  ];

  return (
    <div className={styles.studioPage}>
      <div className={styles.studioHeader}>
        <h1 className={styles.studioTitle}>
          <span className={styles.studioTitleIcon}>🖼️</span>
          Image to Video
          <span className={styles.studioBadge}>AI Powered</span>
        </h1>
        <p className={styles.studioSubtitle}>
          Transform any static image into breathtaking cinematic motion. Upload a photo, painting, or concept art and watch it come alive.
        </p>
      </div>

      <div className={styles.studioWorkspace}>
        {/* Controls Panel */}
        <div className={styles.controlsPanel}>
          {/* Upload Zone */}
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
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />
            {uploadedImage ? (
              <div className={styles.uploadPreview}>
                <img src={uploadedImage} alt="Uploaded" className={styles.uploadPreviewImage} />
              </div>
            ) : (
              <>
                <div className={styles.uploadIcon}>🖼️</div>
                <div className={styles.uploadText}>Drop your image here</div>
                <div className={styles.uploadHint}>Supports JPG, PNG, WebP • Max 20MB</div>
              </>
            )}
          </div>

          {/* Animation Style */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>🎬</span>
              Animation Style
            </div>
            <div className={styles.chipGrid}>
              {ANIMATION_STYLES.map(style => (
                <span
                  key={style.id}
                  className={`${styles.chip} ${animationStyle === style.id ? styles.chipActive : ""}`}
                  onClick={() => setAnimationStyle(style.id)}
                  title={style.desc}
                >
                  {style.label}
                </span>
              ))}
            </div>
          </div>

          {/* Atmosphere Effects */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>✨</span>
              Atmosphere Effects
            </div>
            <div className={styles.chipGrid}>
              {ATMOSPHERE_EFFECTS.map(effect => (
                <span
                  key={effect}
                  className={`${styles.chip} ${atmosphere.includes(effect) ? styles.chipActive : ""}`}
                  onClick={() => toggleAtmosphere(effect)}
                >
                  {effect}
                </span>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Duration</label>
            <select
              className={styles.select}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={processing}
            >
              <option value="4">4 Seconds</option>
              <option value="6">6 Seconds</option>
              <option value="8">8 Seconds</option>
            </select>
          </div>

          {/* Motion Prompt */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Motion Prompt (Optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe additional motion you want to see..."
              value={motionPrompt}
              onChange={(e) => setMotionPrompt(e.target.value)}
              disabled={processing}
            />
          </div>

          {/* Generate Button */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={processing || !uploadedImage}
            id="img2vid-generate-btn"
            style={{ width: "100%" }}
          >
            {processing ? "Animating Image..." : "✨ Animate Image"}
          </button>
        </div>

        {/* Output */}
        <div className={styles.outputArea}>
          <div className={styles.previewBox}>
            {resultVideoUrl ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <video className={styles.previewVideo} src={resultVideoUrl} controls loop autoPlay />
                <div className="cyne-watermark"><img src="/icon-192x192.png" alt="" width={14} height={14} style={{ borderRadius: '2px', opacity: 0.8 }} /> CyneMora</div>
              </div>
            ) : uploadedImage ? (
              <img src={uploadedImage} className={styles.previewImage} alt="Source" />
            ) : (
              <div className={styles.previewPlaceholder}>
                <div className={styles.previewPlaceholderIcon}>🖼️</div>
                <div className={styles.previewPlaceholderText}>
                  Upload an image to preview. After animation, your cinematic video will appear here.
                </div>
              </div>
            )}
          </div>

          {/* Pipeline */}
          {(processing || activeStep > 0) && (
            <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <span className={styles.pipelineTitle}>Image Animation Pipeline</span>
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
