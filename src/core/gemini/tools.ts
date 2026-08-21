import type { Feedback, HiringVerdict } from '@/core/state/types';

/**
 * Tool declaration sent to Gemini in the `setup` message.
 *
 * NOTE: Gemini Live API uses uppercase type names ("OBJECT", "STRING", "NUMBER",
 * "ARRAY", "BOOLEAN") rather than the JSON Schema lowercase convention.
 */
export const END_INTERVIEW_TOOL = {
  function_declarations: [
    {
      name: 'end_interview_and_generate_feedback',
      description:
        'Call this function exactly ONCE when the interview is complete — either because the candidate explicitly asked to end it, or because you have asked 8-12 substantive questions and gathered enough signal. Calling this function ends the session and shows the candidate their feedback scorecard.',
      parameters: {
        type: 'OBJECT',
        properties: {
          overall_score: {
            type: 'NUMBER',
            description:
              'Overall interview score from 0 to 100, weighted across technical depth, communication, and problem solving.',
          },
          hiring_verdict: {
            type: 'STRING',
            description: 'Final hiring recommendation.',
            enum: [
              'Strong Hire',
              'Hire',
              'Leaning Hire',
              'Leaning No Hire',
              'No Hire',
            ] as HiringVerdict[],
          },
          technical_depth: {
            type: 'NUMBER',
            description:
              'Sub-score for technical depth, domain knowledge, and code/system reasoning. 0 to 10.',
          },
          communication_clarity: {
            type: 'NUMBER',
            description:
              'Sub-score for clarity, concision, and structure of communication. 0 to 10.',
          },
          problem_solving: {
            type: 'NUMBER',
            description:
              'Sub-score for problem decomposition, reasoning under ambiguity, and tradeoff analysis. 0 to 10.',
          },
          key_strengths: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              '3-5 specific, concrete strengths the candidate demonstrated during the interview.',
          },
          areas_for_improvement: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              '3-5 specific, actionable areas where the candidate could improve.',
          },
          detailed_summary: {
            type: 'STRING',
            description:
              'A 2-3 paragraph narrative summary of the candidate performance, highlighting notable moments and the rationale for the verdict. Plain prose, no markdown.',
          },
        },
        required: [
          'overall_score',
          'hiring_verdict',
          'technical_depth',
          'communication_clarity',
          'problem_solving',
          'key_strengths',
          'areas_for_improvement',
          'detailed_summary',
        ],
      },
    },
  ],
};

const VALID_VERDICTS: HiringVerdict[] = [
  'Strong Hire',
  'Hire',
  'Leaning Hire',
  'Leaning No Hire',
  'No Hire',
];

function clampNumber(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x : String(x ?? '')))
    .filter((s) => s.trim().length > 0);
}

/**
 * Validate the raw args returned by Gemini's toolCall and coerce into a
 * strongly-typed Feedback object. Falls back to safe defaults on malformed data.
 */
export function handleEndInterviewToolCall(
  args: Record<string, unknown> | undefined,
): Feedback {
  const a = args ?? {};

  const verdictRaw = String(a.hiring_verdict ?? '');
  const hiring_verdict: HiringVerdict = (VALID_VERDICTS as string[]).includes(
    verdictRaw,
  )
    ? (verdictRaw as HiringVerdict)
    : 'No Hire';

  return {
    overall_score: Math.round(clampNumber(a.overall_score, 0, 100)),
    hiring_verdict,
    technical_depth: clampNumber(a.technical_depth, 0, 10),
    communication_clarity: clampNumber(a.communication_clarity, 0, 10),
    problem_solving: clampNumber(a.problem_solving, 0, 10),
    key_strengths: toStringArray(a.key_strengths).slice(0, 6),
    areas_for_improvement: toStringArray(a.areas_for_improvement).slice(0, 6),
    detailed_summary:
      typeof a.detailed_summary === 'string' && a.detailed_summary.trim()
        ? a.detailed_summary.trim()
        : 'The interview ended without a detailed evaluation from the interviewer.',
  };
}
