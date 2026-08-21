// Shared strongly-typed data models for the AI Voice Interviewer.

export type Phase = 'setup' | 'live' | 'feedback';

export type Role =
  | 'Frontend Engineer'
  | 'Backend Engineer'
  | 'Fullstack Engineer'
  | 'Product Manager'
  | 'DevOps Engineer'
  | 'Data Scientist';

export type ExperienceLevel = 'Junior' | 'Mid' | 'Senior' | 'Staff';

export type AudioState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface InterviewConfig {
  candidateName: string;
  role: Role;
  level: ExperienceLevel;
  apiKey?: string;
}

export type HiringVerdict =
  | 'Strong Hire'
  | 'Hire'
  | 'Leaning Hire'
  | 'Leaning No Hire'
  | 'No Hire';

export interface Feedback {
  overall_score: number; // 0-100
  hiring_verdict: HiringVerdict;
  technical_depth: number; // 0-10
  communication_clarity: number; // 0-10
  problem_solving: number; // 0-10
  key_strengths: string[];
  areas_for_improvement: string[];
  detailed_summary: string;
}

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
