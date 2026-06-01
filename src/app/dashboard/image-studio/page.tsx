/* ========================================
   CyneMora — AI Image Studio
   Text-to-Image generation workspace
   Powered by Banana Pro & Gemini 3 Pro Image
   ======================================== */

"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth-context";
import styles from "./image-studio.module.css";

const STYLES = [
  { id: "photorealistic", label: "Photorealistic" },
  { id: "cinematic", label: "Cinematic" },
  { id: "concept-art", label: "Concept Art" },
  { id: "illustration", label: "Illustration" },
  { id: "anime", label: "Anime" },
  { id: "watercolor", label: "Watercolor" },
  { id: "oil-painting", label: "Oil Painting" },
  { id: "3d-render", label: "3D Render" },
  { id: "pixel-art", label: "Pixel Art" },
  { id: "sketch", label: "Sketch" },
  { id: "editorial", label: "Editorial" },
  { id: "product", label: "Product" },
];

const PROVIDERS = [
  { id: "auto", label: "Auto Select", icon: "⚡", desc: "Intelligent routing" },
  { id: "banana-pro", label: "Banana Pro", icon: "🍌", desc: "Photorealistic" },
  { id: "gemini-image", label: "Gemini 3 Pro", icon: "✨", desc: "Creative" },
  { id: "openai-image", label: "GPT Image 2", icon: "🧠", desc: "General Art" },
];

const IMAGE_COUNTS = [1, 4, 8, 16];

interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  provider: string;
  imageUrls: string[];
  aspectRatio: string;
  createdAt: Date;
}

const PROMPT_TEMPLATES = [
  { label: "Product Shot", prompt: "Professional product photography of {subject}, studio lighting, white background, commercial quality" },
  { label: "Cinematic Scene", prompt: "Cinematic wide shot of {subject}, dramatic lighting, anamorphic lens flare, film grain, 35mm" },
  { label: "Portrait", prompt: "Professional portrait photograph of {subject}, shallow depth of field, golden hour lighting, editorial quality" },
  { label: "Fantasy Art", prompt: "Epic fantasy illustration of {subject}, detailed environment, volumetric lighting, concept art style" },
  { label: "Marketing Banner", prompt: "Modern marketing graphic featuring {subject}, clean typography space, vibrant gradient background, premium brand feel" },
  { label: "Storyboard Frame", prompt: "Storyboard frame showing {subject}, cinematic composition, clear action pose, pencil sketch style with color washes" },
];

export default function ImageStudioPage() {
  const { user } = useAuth();

  // Generation state
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("auto");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageCount, setImageCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [logText, setLogText] = useState("");

  // Results state
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Load history from Firestore
  useEffect(() => {
    if (!user) return;

    async function loadHistory() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "generated_images"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const items: GeneratedImage[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          items.push({
            id: docSnap.id,
            prompt: d.prompt || "",
            style: d.style || "default",
            provider: d.provider || "auto",
            imageUrls: d.imageUrls || [],
            aspectRatio: d.aspectRatio || "1:1",
            createdAt: d.createdAt?.toDate?.() || new Date(),
          });
        });
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setHistory(items);
      } catch (err) {
        console.warn("Failed to load image history:", (err as Error).message);
      }
    }

    loadHistory();
  }, [user]);

  // Apply prompt template
  const applyTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    const subject = prompt.trim() || "a subject";
    setPrompt(template.prompt.replace("{subject}", subject));
  };

  // Generate images
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setActiveStep(1);
    setLogText("Analyzing prompt and selecting optimal model...");
    setGeneratedImages([]);

    try {
      setActiveStep(2);
      setLogText(`Generating ${imageCount} image${imageCount > 1 ? "s" : ""} via CyneMora Image Engine...`);

      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: negativePrompt || undefined,
          aspectRatio,
          style: selectedStyle || undefined,
          numberOfImages: imageCount,
          provider: selectedProvider,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || "Image generation failed");
      }

      const data = await res.json();
      const operation = data.operation;

      if (operation.status === "completed" && operation.imageUrls?.length > 0) {
        setActiveStep(3);
        setLogText("Images generated successfully! Syncing to gallery...");
        setGeneratedImages(operation.imageUrls);

        // Add to local history
        const newEntry: GeneratedImage = {
          id: `img-${Date.now()}`,
          prompt,
          style: selectedStyle || "default",
          provider: operation.provider || selectedProvider,
          imageUrls: operation.imageUrls,
          aspectRatio,
          createdAt: new Date(),
        };
        setHistory((prev) => [newEntry, ...prev]);
      } else if (operation.status === "failed") {
        throw new Error(operation.error || "Generation failed");
      }

      setLogText("Generation complete!");
    } catch (err) {
      console.error("[ImageStudio] Generation failed:", err);
      setLogText(`Error: ${(err as Error).message}`);
    } finally {
      setGenerating(false);
      setTimeout(() => setActiveStep(0), 3000);
    }
  };

  // Download image
  const handleDownload = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `cynemora-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const PIPELINE_STEPS = [
    { label: "Route", num: 1 },
    { label: "Generate", num: 2 },
    { label: "Deliver", num: 3 },
  ];

  const gridClass =
    generatedImages.length === 1
      ? styles.imageGrid1
      : generatedImages.length <= 4
      ? styles.imageGrid4
      : styles.imageGrid8;

  return (
    <div className={styles.studioPage}>
      {/* Header */}
      <div className={styles.studioHeader}>
        <h1 className={styles.studioTitle}>
          <span className={styles.studioTitleIcon}>🎨</span>
          AI Image Studio
          <span className={styles.studioBadge}>New</span>
        </h1>
        <p className={styles.studioSubtitle}>
          Generate stunning images with Banana Pro and Gemini 3 Pro Image.
          Intelligent model routing picks the best provider for your vision.
        </p>
      </div>

      <div className={styles.workspace}>
        {/* Controls Panel */}
        <div className={styles.controlsPanel}>
          {/* Prompt */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Visual Prompt</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe the image you want to create in vivid detail..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
            />
          </div>

          {/* Prompt Templates */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Quick Templates</label>
            <div className={styles.chipGrid}>
              {PROMPT_TEMPLATES.map((tpl) => (
                <span
                  key={tpl.label}
                  className={styles.chip}
                  onClick={() => !generating && applyTemplate(tpl)}
                >
                  {tpl.label}
                </span>
              ))}
            </div>
          </div>

          {/* Negative Prompt */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Negative Prompt</label>
            <textarea
              className={styles.textareaNeg}
              placeholder="Describe what you don't want (blurry, low quality, watermark...)"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              disabled={generating}
            />
          </div>

          {/* Provider Selection */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Model</label>
            <div className={styles.providerGrid}>
              {PROVIDERS.map((prov) => (
                <div
                  key={prov.id}
                  className={`${styles.providerChip} ${
                    selectedProvider === prov.id ? styles.providerChipActive : ""
                  }`}
                  onClick={() => !generating && setSelectedProvider(prov.id)}
                >
                  <span className={styles.providerChipIcon}>{prov.icon}</span>
                  {prov.label}
                </div>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Style</label>
            <div className={styles.chipGrid}>
              {STYLES.map((s) => (
                <span
                  key={s.id}
                  className={`${styles.chip} ${
                    selectedStyle === s.id ? styles.chipActive : ""
                  }`}
                  onClick={() =>
                    !generating &&
                    setSelectedStyle(selectedStyle === s.id ? "" : s.id)
                  }
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Settings Row */}
          <div className={styles.selectGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Aspect Ratio</label>
              <select
                className={styles.select}
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={generating}
              >
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="9:16">9:16 Portrait</option>
                <option value="4:3">4:3 Classic</option>
                <option value="3:4">3:4 Tall</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Images</label>
              <div className={styles.countGrid}>
                {IMAGE_COUNTS.map((count) => (
                  <div
                    key={count}
                    className={`${styles.countBtn} ${
                      imageCount === count ? styles.countBtnActive : ""
                    }`}
                    onClick={() => !generating && setImageCount(count)}
                  >
                    {count}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            id="image-studio-generate-btn"
            style={{ width: "100%" }}
          >
            {generating ? "Generating..." : "🎨 Generate Images"}
          </button>
        </div>

        {/* Output Area */}
        <div className={styles.outputArea}>
          {/* Pipeline Status */}
          {(generating || activeStep > 0) && (
            <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <span className={styles.pipelineTitle}>
                  CyneMora Image Pipeline
                </span>
                <span className={styles.pipelineLog}>{logText}</span>
              </div>
              <div className={styles.pipelineSteps}>
                {PIPELINE_STEPS.map((step) => (
                  <div key={step.num} className={styles.pipelineStep}>
                    <div
                      className={`${styles.pipelineStepIcon} ${
                        activeStep === step.num
                          ? styles.pipelineStepIconActive
                          : ""
                      } ${
                        activeStep > step.num
                          ? styles.pipelineStepIconDone
                          : ""
                      }`}
                    >
                      {activeStep > step.num ? "✓" : step.num}
                    </div>
                    <span
                      className={`${styles.pipelineStepLabel} ${
                        activeStep === step.num
                          ? styles.pipelineStepLabelActive
                          : ""
                      } ${
                        activeStep > step.num
                          ? styles.pipelineStepLabelDone
                          : ""
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Images */}
          {generatedImages.length > 0 ? (
            <div className={`${styles.imageGrid} ${gridClass}`}>
              {generatedImages.map((url, idx) => (
                <div
                  key={idx}
                  className={styles.imageCard}
                  onClick={() => setLightboxUrl(url)}
                >
                  <img src={url} alt={`Generated image ${idx + 1}`} />
                  <div className={styles.imageCardOverlay}>
                    <button
                      className={styles.imageActionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(url);
                      }}
                      title="Download"
                    >
                      ⬇
                    </button>
                    <button
                      className={styles.imageActionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(url);
                      }}
                      title="View Full Size"
                    >
                      🔍
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎨</div>
              <div className={styles.emptyTitle}>
                Your Creative Canvas Awaits
              </div>
              <div className={styles.emptyDesc}>
                Describe your vision, pick a style, and let CyneMora&apos;s AI
                engine bring it to life. Generated images are automatically
                available throughout the platform.
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className={styles.historySection}>
              <div className={styles.historyHeader}>
                <h2 className={styles.historyTitle}>Recent Generations</h2>
              </div>
              <div className={styles.historyGrid}>
                {history.slice(0, 12).map((item) =>
                  item.imageUrls.map((url, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className={styles.historyCard}
                      onClick={() => setLightboxUrl(url)}
                    >
                      <img
                        className={styles.historyCardImage}
                        src={url}
                        alt={item.prompt}
                      />
                      <div className={styles.historyCardBody}>
                        <div className={styles.historyCardPrompt}>
                          {item.prompt}
                        </div>
                      </div>
                      <div className={styles.historyCardMeta}>
                        <span>{item.style}</span>
                        <span>{item.provider}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className={styles.lightbox}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className={styles.lightboxClose}
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <img
            className={styles.lightboxImage}
            src={lightboxUrl}
            alt="Full size preview"
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.lightboxActions}>
            <button
              className={styles.lightboxActionBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(lightboxUrl);
              }}
            >
              ⬇ Download
            </button>
            <button
              className={styles.lightboxActionBtn}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(lightboxUrl);
              }}
            >
              📋 Copy URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
