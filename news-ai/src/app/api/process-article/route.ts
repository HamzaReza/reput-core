import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/lib/prompts';
import type { AIDraft } from '@/lib/mockDrafts';

export const maxDuration = 60;

interface FirecrawlResponse {
  success: boolean;
  data?: { markdown?: string };
}

async function isPdf(url: string): Promise<boolean> {
  const path = url.toLowerCase().split('?')[0];
  if (path.includes('.pdf')) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    const ct = res.headers.get('content-type') ?? '';
    const cd = res.headers.get('content-disposition') ?? '';
    controller.abort();
    return ct.includes('application/pdf') || cd.toLowerCase().includes('.pdf');
  } catch { return false; }
}

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as FirecrawlResponse;
    if (!data.success || !data.data?.markdown) return null;
    return data.data.markdown.slice(0, 8000);
  } catch (err) {
    console.error(`[firecrawl] Failed to scrape ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 55)
    .replace(/-$/, '');
}

function extract(rawOutput: string, label: string): string {
  const match = rawOutput.match(new RegExp(`${label}:\\s*(.+?)(?=\\n[A-ZÀÈÉÌÒÙ ]+:|$)`, 's'));
  return match ? match[1].trim() : '';
}

export async function POST(request: Request) {
  try {
    const { url, sourceName, originalTitle, snippet, testataNome, agentePrompt, lunghezza, lingua } =
      await request.json();

    if (!url) {
      return Response.json({ error: 'url required' }, { status: 400 });
    }

    // Step 1: Extract full article text via Firecrawl REST API (skip PDFs)
    let articleText = snippet || '';
    const pdf = await isPdf(url);

    if (!pdf) {
      const md = await scrapeWithFirecrawl(url);
      if (md) articleText = md;
    }

    if (!articleText.trim()) {
      return Response.json({ error: 'Could not extract article content' }, { status: 422 });
    }

    // Step 2: Claude — generate new article (non-streaming)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const systemPrompt = buildSystemPrompt({
      articleText,
      testataNome: testataNome || sourceName,
      agenteId: '1',
      agentePrompt,
      lunghezza: lunghezza || 'Media (250-350 parole)',
      lingua: lingua || 'Italiano',
      mantieniTitolo: false,
      mode: 'rewrite',
    });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: articleText }],
    });

    const rawOutput = (message.content[0] as { type: string; text: string }).text;

    // Step 3: Parse Claude output into draft fields
    const generatedTitle = extract(rawOutput, 'TITLE') || originalTitle;
    const kicker = extract(rawOutput, 'KICKER') || '';
    const body = extract(rawOutput, 'BODY') || rawOutput;
    const tagsRaw = extract(rawOutput, 'SEO TAGS');
    const city = extract(rawOutput, 'CITY') || 'National';
    const category = extract(rawOutput, 'SECTION') || 'News';

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [category, sourceName.split(' ')[0], 'Notizie'];

    const draft: AIDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      originalSource: sourceName,
      originalUrl: url,
      originalTitle,
      originalExcerpt: snippet || articleText.slice(0, 300),
      originalPublishedAt: new Date().toISOString(),
      generatedKicker: kicker,
      generatedTitle,
      generatedSubtitle: kicker,
      generatedBodyPreview: body.slice(0, 200),
      generatedBody: body,
      generatedSeoTitle: `${generatedTitle.substring(0, 52)}... | Redazione`,
      generatedMetaDescription: kicker || generatedTitle,
      generatedSlug: slugify(generatedTitle),
      generatedTags: tags,
      generatedCategory: category,
      generatedCity: city,
      coverImageUrl: '',
      coverImageStatus: 'Not selected',
      coverImageSource: 'Unsplash',
      coverImageLicense: '—',
      coverImageAttribution: '—',
      imageSearchQuery: `${category} ${generatedTitle.split(' ').slice(0, 3).join(' ')}`,
      imageAltText: `Immagine correlata all'articolo su ${category}`,
      imageCaption: '—',
      alternativeImages: [],
      priorityScore: Math.floor(Math.random() * 30) + 61,
      priorityReasons: ['Authoritative source'],
      status: 'AI Draft',
      isBreaking: false,
    };

    return Response.json({ draft });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[process-article] error:', msg);
    return Response.json({ error: msg || 'Processing failed' }, { status: 500 });
  }
}
