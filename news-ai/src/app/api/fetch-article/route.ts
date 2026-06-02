import { NextResponse } from 'next/server';

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
    console.error(`[firecrawl] fetch-article failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Block PDFs before attempting any scrape
    const pdf = await isPdf(url);
    if (pdf) {
      return NextResponse.json(
        { error: 'PDF files cannot be extracted. Please paste the article text directly.' },
        { status: 422 }
      );
    }

    // Try Firecrawl REST API first for clean markdown extraction
    const md = await scrapeWithFirecrawl(url);
    if (md) {
      return NextResponse.json({ text: md });
    }

    // Fallback: naive HTML stripping
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    text = text.replace(/<[^>]*>/g, ' ');
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    text = text.replace(/\s+/g, ' ').trim();

    return NextResponse.json({ text: text.substring(0, 5000) });
  } catch (error: unknown) {
    console.error('fetch-article error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch article' },
      { status: 500 }
    );
  }
}
