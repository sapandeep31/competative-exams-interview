import { NextRequest, NextResponse } from 'next/server';
import type { Feedback, InterviewConfig, TranscriptEntry } from '@/core/state/types';
import { handleEndInterviewToolCall } from '@/core/gemini/tools';

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
    const apiKey =
      body.apiKey?.trim() ||
      config?.apiKey?.trim() ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is required for evaluation.' },
        { status: 400 },
      );
    }

    const candidateName = config?.candidateName || 'Candidate';
    const role = config?.role || 'Fullstack Engineer';
    const level = config?.level || 'Mid';

    // Format transcript text
    const formattedTranscript =
      transcript.length > 0
        ? transcript
            .map((t) => `${t.role === 'interviewer' ? 'Interviewer' : candidateName}: ${t.text}`)
            .join('\n\n')
        : 'No spoken transcript was captured during this session.';

    const systemPrompt = `You are an expert technical hiring manager evaluating an interview.
Candidate: ${candidateName}
Target Role: ${role}
Experience Level: ${level}

Evaluate the interview based on the provided transcript. Even if the interview was ended early, evaluate whatever responses and answers the candidate provided fairly against the expectations for a ${level} ${role}.

Return a structured JSON object with EXACTLY the following fields:
- overall_score (integer between 0 and 100)
- hiring_verdict (one of: "Strong Hire", "Hire", "Leaning Hire", "Leaning No Hire", "No Hire")
- technical_depth (number between 0 and 10)
- communication_clarity (number between 0 and 10)
- problem_solving (number between 0 and 10)
- key_strengths (array of 3-5 specific concrete strings)
- areas_for_improvement (array of 3-5 actionable improvement strings)
- detailed_summary (2-3 paragraph objective evaluation prose, no markdown bullets)`;

    const prompt = `Interview Transcript:\n${formattedTranscript}\n\nPlease generate the comprehensive evaluation JSON now.`;

    const modelName = 'gemini-2.5-flash';
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
    const validatedFeedback: Feedback = handleEndInterviewToolCall(parsedJson);

    return NextResponse.json({ feedback: validatedFeedback });
  } catch (error) {
    console.error('[Evaluate API] Error generating feedback:', error);

    const fallbackFeedback: Feedback = {
      overall_score: 50,
      hiring_verdict: 'Leaning No Hire',
      technical_depth: 5,
      communication_clarity: 5,
      problem_solving: 5,
      key_strengths: ['Participated in the interview discussion'],
      areas_for_improvement: ['Session was concluded before full automated scoring'],
      detailed_summary:
        'The interview was concluded and evaluated. However, standard LLM scorecard generation encountered a parsing fallback.',
    };

    return NextResponse.json({ feedback: fallbackFeedback }, { status: 200 });
  }
}
