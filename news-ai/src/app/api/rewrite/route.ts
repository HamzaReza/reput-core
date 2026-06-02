import { NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { buildSystemPrompt, RewriteConfig } from '@/lib/prompts';

export const maxDuration = 60; // Set max duration for Vercel if needed

export async function POST(req: Request) {
  try {
    const config = (await req.json()) as RewriteConfig;

    if (!config.articleText) {
      return NextResponse.json({ error: 'Article text is required' }, { status: 400 });
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
       return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
    }

    const systemPrompt = buildSystemPrompt(config);

    const userMessageContent = config.mode === 'brief'
      ? `Ecco il brief/prompt per l'articolo da generare:\n\n${config.briefText}`
      : `Ecco l'articolo originale da riscrivere:\n\n${config.articleText}`;

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessageContent
        }
      ],
    });

    return new Response(stream.toReadableStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Rewrite error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during rewriting' },
      { status: 500 }
    );
  }
}
