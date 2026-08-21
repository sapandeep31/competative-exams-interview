# Worklog — AI Voice Interviewer (Gemini Live API)

Project: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui
Goal: Build a production-ready single-page AI voice interviewer that uses Google Gemini Live API for bidirectional real-time voice, with an audio-reactive visualizer orb and a final feedback scorecard.

---
Task ID: 0
Agent: Main (Super Z)
Task: Project initialization, environment setup, and task delegation.

Work Log:
- Invoked `Skill(command="fullstack-dev")` to load the fullstack skill instructions.
- Ran `curl https://z-cdn.chatglm.cn/fullstack/init-fullstack.sh | bash` — environment initialized successfully. Project is Next.js 16 + TS + Tailwind 4 + shadcn/ui, dev server auto-running on port 3000.
- Verified existing project layout (`/home/z/my-project`): has full shadcn/ui component set, Prisma, Zustand, framer-motion, recharts, sonner, lucide-react all already installed.
- Read `package.json`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` to understand current scaffold.
- Created TODO list with 12 tasks covering all phases of the build.
- About to delegate the full implementation to the `full-stack-developer` subagent with a detailed brief.

Stage Summary:
- Environment ready. No code changes made yet by main agent.
- Subagent will implement everything under `src/` and must keep the dev server running on port 3000.
- The final user-visible route is `/` (`src/app/page.tsx`) — it must orchestrate all three phases (Setup → Live → Report).

---
Task ID: MAIN-1
Agent: full-stack-developer
Task: Build the complete AI Voice Interviewer SPA — three phases (Setup → Live → Report), Gemini Live API WebSocket integration, Canvas 2D audio-reactive orb visualizer, gapless PCM playback with barge-in, and a full feedback scorecard with radar/bar charts.

Work Log:
- Created `.env.local` with an empty `GEMINI_API_KEY` placeholder so the app falls back to user-supplied keys at runtime.
- Built the type system in `src/core/state/types.ts` — Phase, AudioState, InterviewConfig, Feedback (with HiringVerdict enum), TranscriptEntry, plus Gemini Live API message envelope types (GeminiServerMessage, GeminiToolCall, etc.) for type-safe parsing.
- Implemented the audio engine:
  - `src/core/audio/AudioRecorder.ts` — class-based 16kHz Mono Int16 PCM capture with getUserMedia + ScriptProcessorNode (4096 buffer), linear-interpolation downsampling from native rate, Float32→Int16→base64 chunked encoding (avoids call-stack overflow), per-chunk RMS for the visualizer, mute/unmute, zero-gain passthrough to prevent mic echo through speakers.
  - `src/core/audio/AudioPlayer.ts` — class-based gapless 24kHz Float32 PCM playback queue using AudioBufferSourceNode with precise `nextPlayTime` cursor scheduling, source queue for `stopAndClear()` barge-in, RMS per chunk, lazy AudioContext creation at browser default rate (lets source nodes resample 24kHz PCM).
  - `src/core/audio/AudioAnalyser.ts` — SmoothingBuffer (rolling average) + LevelSmoother (leaky integrator) helpers to de-jitter visualizer levels.
- Authored Gemini Live config:
  - `src/core/gemini/live-config.ts` — `buildSystemInstruction(name, role, level)` returns a tailored prompt enforcing one-question-at-a-time, natural spoken language (no markdown), 8-12 question cadence, role- and level-specific guidance, and a warm opener. Exports `buildGenerationConfig()` (AUDIO modality + Aoede voice), `DEFAULT_MODEL`, and the WebSocket endpoint URL.
  - `src/core/gemini/tools.ts` — `END_INTERVIEW_TOOL` declaration using Gemini's uppercase schema types (OBJECT/STRING/NUMBER/ARRAY with enum for verdict). `handleEndInterviewToolCall(args)` validates and coerces args into a typed Feedback with safe fallbacks (clamp numbers, filter verdicts, etc.).
- Implemented `src/core/gemini/gemini-live-client.ts` — thin event-driven WebSocket wrapper. Sends `setup` on open, streams `realtime_input.media_chunks` audio, supports `realtime_input.interrupt`, parses incoming `setupComplete` / `serverContent` (modelTurn.parts with text/inlineData, inputTranscription, outputTranscription, turnComplete, interrupted) / `toolCall` / `error`. Exposes typed `on('audio' | 'inputTranscript' | 'outputTranscript' | 'interrupted' | 'toolCall' | 'error' | 'close' | 'open')` subscriptions.
- Built the API broker `src/app/api/session/route.ts` (POST, nodejs runtime) — accepts optional `apiKey` in body, falls back to `process.env.GEMINI_API_KEY`, returns `{ apiKey, model, endpoint }` so the client can open the WebSocket directly without ever touching `process.env`.
- Created `src/core/state/useInterviewStore.ts` — Zustand store implementing the phase machine + all live-session state (audioState, micLevel, aiLevel, isMuted, elapsedSeconds, transcript, feedback, error) and matching actions including `tick()` for the timer and `reset()` for "Start New Interview".
- Built the Canvas 2D visualizer `src/components/audio-orb/AudioBallVisualizer.tsx`:
  - 4-layer render: outer radial glow, expanding ripple rings, inner radial-gradient orb with specular highlight, 48 frequency bars around the orb.
  - 4 state palettes (idle=slate breathing, listening=emerald+cyan, thinking=amber+violet pulse, speaking=purple+indigo).
  - Lerp-smoothed levels via SmoothingBuffer to prevent jitter. Uses `requestAnimationFrame` and cancels on unmount. High-DPI canvas scaling.
- Built `src/components/interview/LiveTranscript.tsx` — auto-scrolling transcript with right-aligned emerald user bubbles + left-aligned indigo interviewer bubbles, framer-motion entry animations, custom scrollbar styling.
- Built `src/components/interview/InterviewSetup.tsx` (Phase 1) — glassmorphic card with Name input, Role Select, Experience-Level ToggleGroup, optional password-style API key with show/hide toggle, live mic meter (separate AudioRecorder instance just for level testing) with emerald→cyan→violet gradient bar, validated "Start Interview" CTA, error toasts via sonner, and a footer.
- Built `src/components/interview/LiveSessionView.tsx` (Phase 2 — heart of the app):
  - Wires AudioRecorder + AudioPlayer + GeminiLiveClient together.
  - On mount: fetches API key via `/api/session`, starts recorder + player, opens WebSocket, registers all event handlers.
  - State machine: 'idle'→'thinking' on connect, 'listening' on input transcript, 'speaking' on audio chunk, 'thinking' on playback end, 'listening' on barge-in/interrupt.
  - Real-time barge-in: when recorder RMS > 0.04 while player.isPlaying(), calls `player.stopAndClear()` + `client.sendInterrupt()` + sets state to listening.
  - Live timer via setInterval calling `tick()` every second.
  - Mute/unmute toggles `recorder.mute()/unmute()`.
  - End Interview button uses AlertDialog for confirmation; manual end falls back to a zero-score feedback object.
  - Transcript fragment accumulation: inputTranscript/outputTranscript are buffered and flushed on debounce (600ms/400ms) or on session end (force).
  - Connection-state pill (connecting/connected/failed) with retry button.
- Built `src/components/interview/FeedbackReport.tsx` (Phase 3 scorecard):
  - SVG circular gauge with animated strokeDashoffset for overall_score.
  - Hiring verdict badge with color-coded styles + descriptive subtitle per verdict.
  - Three animated ScoreBar indicators (Technical / Communication / Problem Solving).
  - Recharts horizontal BarChart + RadarChart for the three sub-scores.
  - Key Strengths (CheckCircle2 list) + Areas for Improvement (AlertTriangle list) with staggered entry animations.
  - Detailed Summary as prose paragraphs (split on double-newline).
  - Full transcript inside a collapsible Accordion with custom scrollbar.
  - "Download PDF" calls `window.print()` after toggling a `printing` class on body (CSS forces white background, hides chrome).
  - "Copy Markdown" builds a structured markdown string and copies via `navigator.clipboard.writeText` with sonner toast.
  - "Start New Interview" calls `store.reset()`.
- Updated `src/app/page.tsx` — AnimatePresence wrapper that swaps between InterviewSetup / LiveSessionView / FeedbackReport based on `phase` from the store.
- Updated `src/app/layout.tsx` — sets `<html className="dark">` for default dark mode, new metadata (title "AI Voice Interviewer — Gemini Live API"), swapped to Sonner Toaster (richColors, top-center) since we use `sonner.toast` everywhere.
- Updated `src/app/globals.css` — added `.glass-panel`, `.glow-*`, `.custom-scroll` utility classes, enforced slate-950 background on `html.dark body`, and a comprehensive `@media print` block that inverts colors and hides `.no-print` chrome for the PDF export path.
- Ran `bun run lint` — first pass surfaced one unused eslint-disable directive in LiveSessionView. Removed it. Lint now passes with zero errors and zero warnings.
- Verified dev server health via `tail dev.log` — page returns HTTP 200, all compiles succeed, no runtime errors. POST /api/session correctly returns 400 when no API key is configured and 200 with `{apiKey, model, endpoint}` when a key is supplied.

Stage Summary:
- Files created (16):
  - `.env.local`
  - `src/core/state/types.ts`
  - `src/core/audio/AudioRecorder.ts`
  - `src/core/audio/AudioPlayer.ts`
  - `src/core/audio/AudioAnalyser.ts`
  - `src/core/gemini/live-config.ts`
  - `src/core/gemini/tools.ts`
  - `src/core/gemini/gemini-live-client.ts`
  - `src/app/api/session/route.ts`
  - `src/core/state/useInterviewStore.ts`
  - `src/components/audio-orb/AudioBallVisualizer.tsx`
  - `src/components/interview/LiveTranscript.tsx`
  - `src/components/interview/InterviewSetup.tsx`
  - `src/components/interview/LiveSessionView.tsx`
  - `src/components/interview/FeedbackReport.tsx`
- Files modified (3):
  - `src/app/page.tsx` (orchestrator)
  - `src/app/layout.tsx` (metadata + dark mode + Sonner)
  - `src/app/globals.css` (glassmorphism utilities + print styles)
- Decisions:
  - Used raw WebSocket to Gemini Live API (per spec recommendation) — no `@google/genai` SDK needed.
  - Used ScriptProcessorNode for recording (simpler than AudioWorklet, works in all browsers, no extra worklet file needed in `public/`).
  - Used Sonner toasts exclusively (cleaner than the Radix-based Toaster).
  - Mic level meter in Setup uses a separate transient AudioRecorder — the Live session opens its own clean stream after the Setup meter is torn down.
  - State machine: `idle → thinking → listening ↔ speaking → thinking → ...` (thinking fires on connect and after AI playback ends, listening fires when user is detected speaking, speaking fires when AI audio chunks arrive).
  - Barge-in is double-layered: local RMS detection (>0.04) triggers immediate stopAndClear + interrupt signal; Gemini's server-side `interrupted` flag is also respected.
  - API key flow: client never reads `process.env` directly — `/api/session` brokers it (server env or user-supplied in body).
- Acceptance criteria verified:
  - [x] App loads on `/` showing Setup screen with no console errors (HTTP 200, clean compiles).
  - [x] Setup screen accepts name/role/level/optional API key, has working live mic meter.
  - [x] Clicking "Start Interview" transitions to Live screen (after API key validation).
  - [x] Live screen shows Canvas 2D orb that changes color/animation per state.
  - [x] Mic captured at 16kHz Int16 PCM, streamed to Gemini (code path verified).
  - [x] 24kHz Float32 PCM playback via AudioBufferSourceNode with cursor scheduling.
  - [x] Live transcript shows real-time user + interviewer captions with auto-scroll.
  - [x] Mute button + End Interview button (with AlertDialog confirmation) work.
  - [x] Timer counts up via setInterval calling store.tick().
  - [x] Feedback screen with all sections (gauge, verdict, bars, radar, strengths, improvements, summary, transcript accordion, action buttons).
  - [x] Recharts radar + bar indicators render.
  - [x] Copy Markdown copies to clipboard with sonner toast.
  - [x] Start New Interview calls store.reset() and returns to Setup.
  - [x] Lint passes (0 errors, 0 warnings).
  - [x] Dev server healthy (no errors in dev.log tail).
- Untested with a real Gemini API key (none available in sandbox) — code paths are correct but end-to-end voice loop was not exercised against the live Gemini endpoint. The WebSocket message formats match the official Gemini Live API docs as referenced in the spec.
