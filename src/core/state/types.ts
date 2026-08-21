// Strongly-typed data models for Competitive Exams Voice Interview Simulation.

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

// For backward compatibility across existing references
export type Role = ExamCategory;
export type ExperienceLevel = SimulationMode;

export interface CandidateBackground {
  education?: string;
  nativeState?: string;
  optionalOrSpecialization?: string;
  hobbies?: string;
}

export interface InterviewConfig {
  candidateName: string;
  examCategory: ExamCategory;
  simulationMode: SimulationMode;
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
