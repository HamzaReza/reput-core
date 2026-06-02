import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const feed = await parser.parseURL(url);
    
    // Ritorna i primi 10 articoli
    const items = feed.items.slice(0, 10).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      contentSnippet: item.contentSnippet,
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    console.warn('RSS parse error:', error.message || error);
    return NextResponse.json({ items: [] });
  }
}
