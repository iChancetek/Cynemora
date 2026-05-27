/* ========================================
   CyneMora — New Project Page
   Create a new cinematic production
   ======================================== */

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./new.module.css";

type InputMethod = "concept" | "script" | "story";

const INPUT_METHODS = [
  {
    id: "concept" as const,
    icon: "💡",
    title: "Quick Concept",
    desc: "Describe your idea in a few sentences",
  },
  {
    id: "script" as const,
    icon: "📝",
    title: "Script / Screenplay",
    desc: "Paste a full or partial screenplay",
  },
  {
    id: "story" as const,
    icon: "📖",
    title: "Story Narrative",
    desc: "Write a detailed story or treatment",
  },
];

const GENRES = [
  "Drama",
  "Sci-Fi",
  "Horror",
  "Thriller",
  "Comedy",
  "Romance",
  "Action",
  "Fantasy",
  "Documentary",
  "Noir",
  "Western",
  "Experimental",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [method, setMethod] = useState<InputMethod>("concept");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre].slice(0, 3)
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // TODO: Call Story Agent API to process the input
      const response = await fetch("/api/agents/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          method,
          genres: selectedGenres,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/projects/${data.projectId || "new"}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setSubmitting(false);
    }
  }

  const placeholders: Record<InputMethod, string> = {
    concept:
      "A lone astronaut discovers an abandoned civilization on Europa. The ruins contain evidence of a consciousness that mirrors her own memories...",
    script:
      "FADE IN:\n\nEXT. EUROPA SURFACE — DAY\n\nA vast, ice-covered landscape stretches to the horizon. The sky is a deep cobalt blue, Jupiter looming impossibly large above...",
    story:
      "In the year 2157, Dr. Elena Vasquez arrives at Europa Station Seven, a research outpost that went silent three weeks ago. What she finds isn't the catastrophic failure everyone expected — the station is pristine, abandoned, and every personal item has been arranged in a pattern that forms a message...",
  };

  return (
    <div className={styles.newProjectPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          New <span className="text-gradient">Production</span>
        </h1>
        <p className={styles.pageDesc}>
          Choose how you want to begin your cinematic project.
        </p>
      </div>

      {/* Input Method Selection */}
      <div className={styles.methodGrid}>
        {INPUT_METHODS.map((m) => (
          <button
            key={m.id}
            className={`${styles.methodCard} ${
              method === m.id ? styles.methodCardActive : ""
            }`}
            onClick={() => setMethod(m.id)}
            type="button"
          >
            <div className={styles.methodIcon}>{m.icon}</div>
            <div className={styles.methodTitle}>{m.title}</div>
            <div className={styles.methodDesc}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Project Form */}
      <form className={styles.projectForm} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label htmlFor="project-title" className={styles.fieldLabel}>
            Project Title
          </label>
          <input
            id="project-title"
            type="text"
            className={styles.textInput}
            placeholder="My Cinematic Project"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="project-content" className={styles.fieldLabel}>
            {method === "concept"
              ? "Your Concept"
              : method === "script"
              ? "Your Script"
              : "Your Story"}
          </label>
          <span className={styles.fieldHint}>
            {method === "concept"
              ? "Describe the core idea, setting, and mood."
              : method === "script"
              ? "Paste your screenplay. CyneMora will parse the structure."
              : "Write your narrative treatment. Include characters, setting, and plot."}
          </span>
          <textarea
            id="project-content"
            className={styles.textArea}
            placeholder={placeholders[method]}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Genre(s) <span className={styles.fieldHint}>— up to 3</span>
          </label>
          <div className={styles.genreRow}>
            {GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`${styles.genreTag} ${
                  selectedGenres.includes(genre)
                    ? styles.genreTagActive
                    : ""
                }`}
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Credit Estimate */}
        <div className={styles.creditEstimate}>
          <div className={styles.creditIcon}>💎</div>
          <div className={styles.creditInfo}>
            <div className={styles.creditLabel}>Estimated Credits</div>
            <div className={styles.creditValue}>
              ~{content.length > 200 ? "15-25" : "5-15"} credits
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting || !title || !content}
            id="create-project-btn"
          >
            {submitting ? "Creating..." : "Create Production"}
          </button>
        </div>
      </form>
    </div>
  );
}
