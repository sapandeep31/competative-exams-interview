# Agent Work Record

**Task ID:** MAIN-1
**Agent:** full-stack-developer
**Date:** 2025

## Task

Build the complete AI Voice Interviewer SPA using Google Gemini Live API for real-time bidirectional voice interviews. Three phases (Setup → Live → Report) orchestrated inside the single `/` route via Zustand state. Includes Canvas 2D audio-reactive orb, gapless PCM playback with barge-in, live transcripts, and a full feedback scorecard with radar/bar charts.

## What was built

See `/home/z/my-project/worklog.md` for the full work log entry (appended under Task ID MAIN-1).

## Architecture

```
src/
├── app/
│   ├── api/session/route.ts          # POST broker for Gemini API key
│   ├── layout.tsx                    # Dark mode default + Sonner Toaster + metadata
│   ├── page.tsx                      # AnimatePresence orchestrator (setup|live|feedback)
│   └── globals.css                   # Glassmorphism utilities + print styles
├── components/
│   ├── audio-orb/AudioBallVisualizer.tsx   # Canvas 2D orb (4-layer render, 4 state palettes)
│   └── interview/
│       ├── InterviewSetup.tsx        # Phase 1: name/role/level/apikey + mic meter
│       ├── LiveSessionView.tsx       # Phase 2: wires recorder+player+gemini+store
│       ├── LiveTranscript.tsx        # Auto-scrolling captions
│       └── FeedbackReport.tsx        # Phase 3: scorecard + radar + export
├── core/
│   ├── audio/
│   │   ├── AudioRecorder.ts          # 16kHz Int16 PCM capture, base64 stream
│   │   ├── AudioPlayer.ts            # 24kHz Float32 PCM gapless queue
│   │   └── AudioAnalyser.ts          # SmoothingBuffer / LevelSmoother
│   ├── gemini/
│   │   ├── gemini-live-client.ts     # WebSocket client (event-driven)
│   │   ├── live-config.ts            # System instruction + generation config
│   │   └── tools.ts                  # end_interview_and_generate_feedback tool
│   └── state/
│       ├── useInterviewStore.ts      # Zustand store / state machine
│       └── types.ts                  # Strongly-typed data models
└── lib/utils.ts                      # existing — cn helper
```

## Key technical decisions

1. **Raw WebSocket to Gemini Live** (no `@google/genai` SDK) — keeps the dependency footprint small and gives full control over the message envelope.
2. **ScriptProcessorNode** for recording (vs AudioWorklet) — simpler, no extra worklet file in `public/`, works in all browsers.
3. **AudioBufferSourceNode cursor scheduling** for playback — `nextPlayTime` cursor + `AudioContext.currentTime`-relative `start()` guarantees gapless playback.
4. **Local barge-in** at RMS > 0.04 threshold while player.isPlaying() — also respects Gemini's server-side `interrupted` flag.
5. **State machine:** `idle → thinking → (listening ↔ speaking → thinking)*` — `thinking` fires on connect and after AI playback ends.
6. **Transcript debouncing:** inputTranscript/outputTranscript fragments are buffered and flushed every 600ms/400ms (or forced on session end) to avoid spamming the store with tiny bubbles.
7. **Print CSS:** `body.printing` class + `@media print` block inverts colors and hides `.no-print` chrome for the "Download PDF" path.

## Verification

- `bun run lint` → 0 errors, 0 warnings
- `curl http://localhost:3000/` → HTTP 200, clean compile
- `curl -X POST /api/session` with empty body → 400 with helpful error message
- `curl -X POST /api/session` with `{"apiKey":"..."}` → 200 with `{apiKey, model, endpoint}`
- `tail dev.log` → no runtime errors, all compiles succeed

## What was NOT tested

End-to-end voice loop against the real Gemini Live API endpoint — no API key was available in the sandbox. The WebSocket message formats (setup, realtime_input.media_chunks, serverContent.modelTurn.parts, toolCall.functionCalls) match the official Gemini Live API documentation as referenced in the spec. To verify the full flow, set `GEMINI_API_KEY` in `.env.local` or paste a key into the Setup screen.
