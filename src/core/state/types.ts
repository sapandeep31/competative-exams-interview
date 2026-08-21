// Strongly-typed data models for Competitive Exams Voice & Video Interview Simulation.

export type Phase = 'setup' | 'live' | 'feedback';

export type ExamCategory =
  | 'UPSC Civil Services (IAS/IPS)'
  | 'SSB Defence Interview (Army/Navy/Air Force)'
  | 'RBI Grade B & Banking PO'
  | 'CAT & IIMs MBA PI'
  | 'State PSC (Civil Services)'
  | 'Judiciary Services (PCS-J)';

export type SimulationMode =
  | 'Comprehensive Board Mock'
  | 'DAF / Rapid-Fire Deep Dive'
  | 'Situational Crisis & Ethical Dilemmas'
  | 'Current Affairs & Policy Grilling';

export type InputMode = 'audio_only' | 'video_audio';

// For backward compatibility across existing references
export type Role = ExamCategory;
export type ExperienceLevel = SimulationMode;

export interface CandidateBackground {
  education?: string; // Degree, college, marks & medium
  nativeState?: string; // Native state, district & hometown
  optionalOrSpecialization?: string; // Optional subject / Stream specialization
  sportsAndGames?: string; // Sports played & level of representation (PIQ Q10)
  leadershipRoles?: string; // Positions of responsibility held in school/college/work (PIQ Q11)
  nccOrScouts?: string; // NCC training, wing, certificate (PIQ Q9)
  hobbies?: string; // Hobbies and extra-curricular activities (DAF / PIQ Q11)
  workExperienceOrAttempts?: string; // Prior job experience & previous exam/SSB attempts
}

export interface InterviewConfig {
  candidateName: string;
  examCategory: ExamCategory;
  simulationMode: SimulationMode;
  inputMode: InputMode;
  background?: CandidateBackground;
  // Aliases for compatibility
  role: ExamCategory;
  level: SimulationMode;
  apiKey?: string;
}

export type ExamVerdict =
  | 'Recommended (Top Merit)'
  | 'Recommended (Service List)'
  | 'Borderline / Reserve List'
  | 'Needs Polish'
  | 'Not Recommended';

// For backward compatibility
export type HiringVerdict = ExamVerdict | 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Leaning No Hire' | 'No Hire';

export interface Feedback {
  overall_score: number; // 0-100
  verdict: ExamVerdict;
  hiring_verdict?: string; // alias
  analytical_depth: number; // 0-10
  administrative_balance: number; // 0-10 (Judgment & OLQs)
  domain_knowledge: number; // 0-10 (Current affairs & Subject)
  articulation_composure: number; // 0-10 (Poise & Communication)

  // Audio & Non-Verbal / Video Delivery Analysis
  speech_fluency?: number; // 0-10 (Fluency, stammering, pauses)
  body_language_poise?: number; // 0-10 (Posture, eye contact, gestures)
  vocal_cues?: string[]; // e.g. ["Stammered on repo rate question", "Calm vocal cadence"]
  non_verbal_cues?: string[]; // e.g. ["Maintained direct eye contact", "Fidgeted hands during stress test"]

  // Legacy aliases
  technical_depth?: number;
  communication_clarity?: number;
  problem_solving?: number;

  olq_or_competency_notes?: string[];
  key_strengths: string[];
  areas_for_improvement: string[];
  detailed_summary: string;
}

export type AudioState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'interviewer';
  text: string;
  timestamp: number;
}

// Gemini Live API message envelope types (for type-safe parsing).
export interface GeminiInlineData {
  mimeType?: string;
  data?: string;
}

export interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
}

export interface GeminiModelTurn {
  parts?: GeminiPart[];
}

export interface GeminiServerContent {
  modelTurn?: GeminiModelTurn;
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  turnComplete?: boolean;
  interrupted?: boolean;
}

export interface GeminiFunctionCall {
  name?: string;
  args?: Record<string, unknown>;
}

export interface GeminiToolCall {
  functionCalls?: GeminiFunctionCall[];
}

export interface GeminiServerMessage {
  setupComplete?: unknown;
  serverContent?: GeminiServerContent;
  toolCall?: GeminiToolCall;
  error?: { message?: string };
}
