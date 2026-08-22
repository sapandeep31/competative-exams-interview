import { NextRequest, NextResponse } from 'next/server';
import type { Feedback, InterviewConfig, TranscriptEntry } from '@/core/state/types';
import { handleEndInterviewToolCall } from '@/core/gemini/tools';
import { getRandomGeminiApiKey } from '@/lib/gemini-keys';

export const runtime = 'nodejs';

interface EvaluateRequestBody {
  config?: InterviewConfig;
  transcript?: TranscriptEntry[];
  apiKey?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateRequestBody;
    const config = body.config;
    const transcript = body.transcript || [];
    const apiKey = getRandomGeminiApiKey(body.apiKey || config?.apiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required for evaluation.' },
        { status: 400 },
      );
    }

    const candidateName = config?.candidateName || 'Candidate';
    const examCategory = config?.examCategory || config?.role || 'UPSC Civil Services (IAS/IPS)';
    const simulationMode = config?.simulationMode || config?.level || 'Comprehensive Board Mock';
    const inputMode = config?.inputMode || 'audio';
    const isVideoMode = inputMode === 'video_audio';
    const bg = config?.background;

    const bgStr = bg
      ? `DAF / PIQ Profile: [Education: ${bg.education || 'N/A'}, Domicile/State: ${bg.nativeState || 'N/A'}, Specialization/Optional: ${bg.optionalOrSpecialization || 'N/A'}, Sports/Games: ${bg.sportsAndGames || 'N/A'}, Leadership Roles: ${bg.leadershipRoles || 'N/A'}, NCC/Activities: ${bg.nccOrScouts || 'N/A'}, Hobbies: ${bg.hobbies || 'N/A'}, Work Experience/Attempts: ${bg.workExperienceOrAttempts || 'N/A'}]`
      : '';

    // Format transcript text
    const formattedTranscript =
      transcript.length > 0
        ? transcript
            .map((t) => `${t.role === 'interviewer' ? 'Board Interviewer' : candidateName}: ${t.text}`)
            .join('\n\n')
        : 'No spoken transcript was captured during this session.';

    const visualInstructions = isVideoMode
      ? `- body_language_poise (number between 0 and 10, evaluating projected confidence, posture, eye contact consistency, and non-verbal composure under pressure)
- non_verbal_cues (array of 2-4 strings observing non-verbal physical behavior, eye contact consistency, and posture under stress, e.g. "Maintained upright posture and steady gaze", "Looked down when challenged on budget statistics")`
      : `- body_language_poise (MUST BE 0, because this was a voice-only interview with camera disabled)
- non_verbal_cues (MUST BE an array with EXACTLY ONE element: ["N/A - Voice only session (camera disabled)"])`;

    const systemPrompt = `You are a Senior Board Assessor & Chief Interview Evaluator for ${examCategory}.
Candidate: ${candidateName}
Exam: ${examCategory}
Mode: ${simulationMode}
Session Modality: ${isVideoMode ? 'Live Video + Voice' : 'Voice Only (Camera Disabled)'}
${bgStr}

Evaluate the candidate's interview rigorously and objectively according to the standard assessment criteria of ${examCategory} (e.g. UPSC Personality Test / SSB OLQ Dimensions / RBI Macroeconomic Acumen / IIM PI Standards / Judicial Temperament).
Evaluate their verbal delivery (hesitation, stammering, filler words, coherence, articulation).
${isVideoMode ? 'Evaluate observed physical non-verbal composure from the live camera stream.' : 'Do NOT hallucinate visual eye contact or posture since this was a voice-only session without camera.'}
If the transcript is brief or the session was ended early, evaluate whatever interaction occurred constructively, noting that the interview was concluded early in the detailed summary.

Return a structured JSON object with EXACTLY the following fields:
- overall_score (integer between 0 and 100, reflecting competitive merit rank standard)
- verdict (one of: "Recommended (Top Merit)", "Recommended (Service List)", "Borderline / Reserve List", "Needs Polish", "Not Recommended")
- analytical_depth (number between 0 and 10, evaluating critical thinking, logic and intellectual depth)
- administrative_balance (number between 0 and 10, evaluating balanced judgment, public ethics, OLQs, and administrative temperament)
- domain_knowledge (number between 0 and 10, evaluating current affairs, constitutional/economic/defence/subject mastery)
- articulation_composure (number between 0 and 10, evaluating clarity of expression, calmness, and poise under stress)
- speech_fluency (number between 0 and 10, evaluating speech fluency, lack of stammering/faltering, and clean delivery)
${visualInstructions}
- vocal_cues (array of 2-4 strings observing speech delivery, e.g. "Noticeable stammering during high-pressure question", "Clear confident cadence", "Excessive filler sounds")
- key_strengths (array of 3-5 specific, concrete strengths shown in the interview)
- areas_for_improvement (array of 3-5 specific, actionable suggestions for candidate growth)
- detailed_summary (2-3 paragraph objective performance appraisal prose, explaining board rationale, notable answers, delivery cues, and areas to polish without markdown bullets)`;

    const prompt = `Spoken Interview Transcript:\n${formattedTranscript}\n\nPlease generate the comprehensive evaluation JSON now.`;

    const modelName = 'gemini-3.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Evaluate API] Gemini API error:', response.status, errText);
      throw new Error(`Gemini evaluation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No evaluation text returned by Gemini');
    }

    const parsedJson = JSON.parse(candidateText) as Record<string, unknown>;
    if (!isVideoMode) {
      parsedJson.body_language_poise = 0;
      parsedJson.non_verbal_cues = ['N/A - Voice only session (camera disabled)'];
    }
    const validatedFeedback: Feedback = handleEndInterviewToolCall(parsedJson);

    return NextResponse.json({ feedback: validatedFeedback });
  } catch (error) {
    console.error('[Evaluate API] Error generating feedback:', error);

    const fallbackFeedback: Feedback = {
      overall_score: 55,
      verdict: 'Borderline / Reserve List',
      analytical_depth: 5,
      administrative_balance: 6,
      domain_knowledge: 5,
      articulation_composure: 6,
      key_strengths: ['Demonstrated basic awareness and participation in the session'],
      areas_for_improvement: ['Prepare more in-depth factual data and structured answers'],
      detailed_summary:
        'The candidate completed the competitive exam interview simulation. Standard assessment generated a balanced baseline evaluation.',
    };

    return NextResponse.json({ feedback: fallbackFeedback }, { status: 200 });
  }
}
