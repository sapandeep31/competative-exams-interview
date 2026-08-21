import type { ExamVerdict, Feedback, HiringVerdict } from '@/core/state/types';

export const END_INTERVIEW_TOOL = {
  function_declarations: [
    {
      name: 'end_interview_and_generate_feedback',
      description:
        'Call this function exactly ONCE when the competitive exam interview is complete — either because the candidate asked to conclude or after asking 8-12 substantive questions across personal background, current affairs, policy/domain knowledge, and ethical/situational dilemmas.',
      parameters: {
        type: 'OBJECT',
        properties: {
          overall_score: {
            type: 'NUMBER',
            description:
              'Overall interview marks/score from 0 to 100, calibrated against the standards of the competitive exam board.',
          },
          verdict: {
            type: 'STRING',
            description: 'Board recommendation status.',
            enum: [
              'Recommended (Top Merit)',
              'Recommended (Service List)',
              'Borderline / Reserve List',
              'Needs Polish',
              'Not Recommended',
            ] as ExamVerdict[],
          },
          analytical_depth: {
            type: 'NUMBER',
            description:
              'Score for critical thinking, logical reasoning, and depth of analysis. 0 to 10.',
          },
          administrative_balance: {
            type: 'NUMBER',
            description:
              'Score for balanced judgment, ethical integrity, officer-like qualities (OLQs), and public empathy. 0 to 10.',
          },
          domain_knowledge: {
            type: 'NUMBER',
            description:
              'Score for current affairs, constitutional/economic/defence/academic subject mastery. 0 to 10.',
          },
          articulation_composure: {
            type: 'NUMBER',
            description:
              'Score for clarity of expression, calmness, and poise under stress. 0 to 10.',
          },
          speech_fluency: {
            type: 'NUMBER',
            description:
              'Score for vocal delivery, stammering/hesitation control, cadence, and absence of excessive filler words. 0 to 10.',
          },
          body_language_poise: {
            type: 'NUMBER',
            description:
              'Score for posture, eye contact, facial calmness, and physical gestures under pressure. 0 to 10.',
          },
          vocal_cues: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              'Specific observations regarding vocal tone, stammering, pauses, volume, and speech delivery.',
          },
          non_verbal_cues: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              'Specific observations regarding eye contact, posture, facial expressions, and physical gestures.',
          },
          key_strengths: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              '3-5 specific, concrete strengths demonstrated by the candidate during the interview.',
          },
          areas_for_improvement: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description:
              '3-5 specific, actionable suggestions for candidate improvement.',
          },
          detailed_summary: {
            type: 'STRING',
            description:
              'A 2-3 paragraph objective performance appraisal summarizing candidate suitability, notable answers, and board rationale. Plain prose, no markdown.',
          },
        },
        required: [
          'overall_score',
          'verdict',
          'analytical_depth',
          'administrative_balance',
          'domain_knowledge',
          'articulation_composure',
          'key_strengths',
          'areas_for_improvement',
          'detailed_summary',
        ],
      },
    },
  ],
};

const VALID_EXAM_VERDICTS: ExamVerdict[] = [
  'Recommended (Top Merit)',
  'Recommended (Service List)',
  'Borderline / Reserve List',
  'Needs Polish',
  'Not Recommended',
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

export function handleEndInterviewToolCall(
  args: Record<string, unknown> | undefined,
): Feedback {
  const a = args ?? {};

  const verdictRaw = String(a.verdict ?? a.hiring_verdict ?? '');
  let verdict: ExamVerdict = 'Not Recommended';
  if ((VALID_EXAM_VERDICTS as string[]).includes(verdictRaw)) {
    verdict = verdictRaw as ExamVerdict;
  } else if (verdictRaw.toLowerCase().includes('strong') || verdictRaw.toLowerCase().includes('top')) {
    verdict = 'Recommended (Top Merit)';
  } else if (verdictRaw.toLowerCase().includes('hire') || verdictRaw.toLowerCase().includes('recommend')) {
    verdict = 'Recommended (Service List)';
  } else if (verdictRaw.toLowerCase().includes('lean') || verdictRaw.toLowerCase().includes('border') || verdictRaw.toLowerCase().includes('reserve')) {
    verdict = 'Borderline / Reserve List';
  } else if (verdictRaw.toLowerCase().includes('polish') || verdictRaw.toLowerCase().includes('improve')) {
    verdict = 'Needs Polish';
  }

  const analytical = clampNumber(a.analytical_depth ?? a.problem_solving ?? a.technical_depth, 0, 10);
  const adminBalance = clampNumber(a.administrative_balance ?? a.technical_depth ?? 5, 0, 10);
  const domain = clampNumber(a.domain_knowledge ?? a.technical_depth ?? 5, 0, 10);
  const articulation = clampNumber(a.articulation_composure ?? a.communication_clarity, 0, 10);

  const speechFluency = a.speech_fluency !== undefined ? clampNumber(a.speech_fluency, 0, 10) : articulation;
  const bodyLanguage = a.body_language_poise !== undefined ? clampNumber(a.body_language_poise, 0, 10) : articulation;

  return {
    overall_score: Math.round(clampNumber(a.overall_score, 0, 100)),
    verdict,
    hiring_verdict: verdict as HiringVerdict,
    analytical_depth: analytical,
    administrative_balance: adminBalance,
    domain_knowledge: domain,
    articulation_composure: articulation,

    speech_fluency: speechFluency,
    body_language_poise: bodyLanguage,
    vocal_cues: toStringArray(a.vocal_cues),
    non_verbal_cues: toStringArray(a.non_verbal_cues),

    // Aliases
    technical_depth: domain,
    communication_clarity: articulation,
    problem_solving: analytical,

    key_strengths: toStringArray(a.key_strengths).slice(0, 6),
    areas_for_improvement: toStringArray(a.areas_for_improvement).slice(0, 6),
    detailed_summary:
      typeof a.detailed_summary === 'string' && a.detailed_summary.trim()
        ? a.detailed_summary.trim()
        : 'The candidate concluded the competitive exam interview simulation.',
  };
}
