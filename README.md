# CyneMora

**Cinema-Native Production Operating System**
*A ChanceTEK LLC Company — [cynemora.us](https://cynemora.us)*

---

CyneMora is not a prompt-to-video application.

CyneMora is a **production-grade, cinema-native AI production operating system** that transforms stories into structured cinematic productions using:

- **OpenAI Agents SDK** — Intelligence, orchestration, continuity, and direction
- **Google Gemini API + Veo 3.1** — Cinematic video rendering
- **Multi-agent pipeline** — 10 specialized AI agents
- **Provider-independent architecture** — No vendor lock-in

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | Next.js 16 (App Router, TypeScript) |
| Styling | Vanilla CSS, CSS Variables |
| Auth | Firebase Authentication |
| Database | Firestore |
| Storage | Firebase Storage |
| Intelligence | `@openai/agents` (OpenAI Agents SDK) |
| Rendering | `@google/genai` (Gemini API / Veo 3.1) |
| PWA | Custom service worker, manifest |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
Story Input → OpenAI Story Agent → Narrative Graph → Scene Decomposition
→ Shot Planning → Prompt Compilation → Veo 3.1 Rendering
→ Continuity Validation → Sequence Assembly → Playback & Export
```

## AI Responsibility Model

- **OpenAI** = Intelligence (story, scenes, shots, continuity, direction)
- **Gemini/Veo** = Rendering (video generation only)

These responsibilities are intentionally separated and never crossed.

## License

Proprietary — ChanceTEK LLC
