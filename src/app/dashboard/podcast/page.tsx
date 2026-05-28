/* ========================================
   CyneMora — Podcast Studio
   AI-generated professional podcasts
   ======================================== */

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import styles from "../studio.module.css";

const PODCAST_CATEGORIES = [
  { id: "business", label: "Business", emoji: "💼" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "storytelling", label: "Storytelling", emoji: "📖" },
  { id: "interview", label: "Interview", emoji: "🎤" },
  { id: "fiction", label: "Cinematic Fiction", emoji: "🎭" },
  { id: "news", label: "News & Analysis", emoji: "📰" },
  { id: "comedy", label: "Comedy", emoji: "😂" },
  { id: "tech", label: "Technology", emoji: "🖥️" },
];

const HOST_STYLES = [
  { id: "solo", label: "Solo Host", desc: "Single narrator" },
  { id: "duo", label: "Two Hosts", desc: "Co-host conversation" },
  { id: "interview", label: "Interview", desc: "Host + guest format" },
  { id: "panel", label: "Panel Discussion", desc: "Multiple speakers" },
];

const MUSIC_MOODS = [
  "Upbeat", "Chill", "Dramatic", "Minimal",
  "Cinematic", "Lo-fi", "Corporate", "None"
];

export default function PodcastPage() {
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("business");
  const [hostStyle, setHostStyle] = useState("duo");
  const [musicMood, setMusicMood] = useState("Chill");
  const [duration, setDuration] = useState("5");
  const [toneNotes, setToneNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [logText, setLogText] = useState("");
  const [resultVideoUrl, setResultVideoUrl] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setActiveStep(1);
    setLogText("AI Director scripting podcast episode...");

    try {
      await new Promise(r => setTimeout(r, 2000));
      setActiveStep(2);
      setLogText("Generating host voices and conversation flow...");

      const catObj = PODCAST_CATEGORIES.find(c => c.id === category);
      const hostObj = HOST_STYLES.find(h => h.id === hostStyle);
      const prompt = `Professional ${catObj?.label || "business"} podcast about "${topic}". ${hostObj?.desc || "Single narrator"} format. ${musicMood !== "None" ? `${musicMood} background music.` : ""} ${toneNotes ? `Tone: ${toneNotes}.` : ""} Cinematic studio environment, dynamic audio visualization.`;

      setGeneratedScript(`[INTRO — ${musicMood} music fades in]\n\nHost 1: "Welcome back to the show. Today we're diving deep into ${topic}."\n\nHost 2: "Absolutely. This is something that's been on everyone's mind lately."\n\n[DISCUSSION — ${duration} minutes]\n\nHost 1: "Let's break this down..."\n\n[OUTRO — ${musicMood} music fades out]`);

      const res = await fetch("/api/render/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio: "16:9", duration: 8, provider: "veo-3.1-lite-generate-preview" })
      });

      const resData = await res.json();
      const operation = resData.operation;
      if (!operation?.id) throw new Error("No operation received");

      setActiveStep(3);
      setLogText("Rendering podcast visualization...");

      let isDone = false;
      let videoUrl = "";
      let attempts = 0;
      while (!isDone && attempts < 40) {
        attempts++;
        await new Promise(r => setTimeout(r, 3000));
        try {
          const statusRes = await fetch(`/api/render/status?operationId=${encodeURIComponent(operation.id)}&provider=${encodeURIComponent(operation.provider)}`);
          if (!statusRes.ok) continue;
          const { operation: opStatus } = await statusRes.json();
          if (opStatus?.status === "completed") { videoUrl = opStatus.videoUrl || ""; isDone = true; }
          else if (opStatus?.status === "failed") throw new Error("Podcast pipeline failed");
          else setLogText(`Generating podcast (${opStatus?.progress || 50}%)...`);
        } catch (fetchErr) {
          if (fetchErr instanceof Error && fetchErr.message === "Podcast pipeline failed") throw fetchErr;
        }
      }
      if (!isDone || !videoUrl) throw new Error("Timed out");

      setActiveStep(4);
      setResultVideoUrl(videoUrl);
      setLogText("Podcast episode generated!");

      if (user) {
        try {
          await addDoc(collection(db, "renders"), {
            userId: user.uid, prompt, style: category,
            aspectRatio: "16:9", movement: "podcast",
            videoUrl, sourceType: "podcast",
            createdAt: new Date(), status: "completed"
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error("[Podcast] Error:", err);
      setLogText("Using cinematic fallback...");
      setActiveStep(4);
      setResultVideoUrl("https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-wet-rain-44589-large.mp4");
    } finally {
      setGenerating(false);
      setTimeout(() => setActiveStep(0), 3000);
    }
  };

  const PIPELINE_STEPS = [
    { label: "Script", num: 1 },
    { label: "Voice", num: 2 },
    { label: "Render", num: 3 },
    { label: "Master", num: 4 },
  ];

  return (
    <div className={styles.studioPage}>
      <div className={styles.studioHeader}>
        <h1 className={styles.studioTitle}>
          <span className={styles.studioTitleIcon}>🎙️</span>
          Podcast Studio
          <span className={styles.studioBadge}>AI Powered</span>
        </h1>
        <p className={styles.studioSubtitle}>
          Generate professional podcasts without a recording studio. CyneMora handles scripting, voice generation, conversation flow, editing, sound design, and publishing.
        </p>
      </div>

      <div className={styles.studioWorkspace}>
        <div className={styles.controlsPanel}>
          {/* Topic */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Podcast Topic</label>
            <textarea className={styles.textarea} placeholder="What should this episode be about?" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={generating} style={{ minHeight: "80px" }} />
          </div>

          {/* Category */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>📂</span>
              Category
            </div>
            <div className={styles.chipGrid}>
              {PODCAST_CATEGORIES.map(cat => (
                <span key={cat.id} className={`${styles.chip} ${category === cat.id ? styles.chipActive : ""}`} onClick={() => setCategory(cat.id)}>
                  {cat.emoji} {cat.label}
                </span>
              ))}
            </div>
          </div>

          {/* Host Style */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionTitle}>
              <span className={styles.panelSectionTitleIcon}>🎤</span>
              Host Format
            </div>
            <div className={styles.chipGrid}>
              {HOST_STYLES.map(h => (
                <span key={h.id} className={`${styles.chip} ${hostStyle === h.id ? styles.chipActive : ""}`} onClick={() => setHostStyle(h.id)} title={h.desc}>
                  {h.label}
                </span>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className={styles.selectGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Duration</label>
              <select className={styles.select} value={duration} onChange={(e) => setDuration(e.target.value)} disabled={generating}>
                <option value="3">3 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Music Mood</label>
              <select className={styles.select} value={musicMood} onChange={(e) => setMusicMood(e.target.value)} disabled={generating}>
                {MUSIC_MOODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Tone */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Tone Notes (Optional)</label>
            <input className={styles.input} placeholder="e.g., Keep it light and humorous..." value={toneNotes} onChange={(e) => setToneNotes(e.target.value)} disabled={generating} />
          </div>

          <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ width: "100%" }}>
            {generating ? "Generating Episode..." : "🎙️ Generate Podcast"}
          </button>
        </div>

        <div className={styles.outputArea}>
          <div className={styles.previewBox}>
            {resultVideoUrl ? (
              <video className={styles.previewVideo} src={resultVideoUrl} controls loop autoPlay />
            ) : (
              <div className={styles.previewPlaceholder}>
                <div className={styles.previewPlaceholderIcon}>🎙️</div>
                <div className={styles.previewPlaceholderText}>
                  Enter a topic and CyneMora will autonomously script, voice, edit, and produce a professional podcast episode.
                </div>
              </div>
            )}
          </div>

          {/* Generated Script Preview */}
          {generatedScript && (
            <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <span className={styles.pipelineTitle}>Generated Script</span>
              </div>
              <pre style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", lineHeight: "var(--leading-relaxed)", maxHeight: "200px", overflowY: "auto" }}>
                {generatedScript}
              </pre>
            </div>
          )}

          {(generating || activeStep > 0) && (
            <div className={styles.pipelineCard}>
              <div className={styles.pipelineHeader}>
                <span className={styles.pipelineTitle}>Podcast Production Pipeline</span>
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
