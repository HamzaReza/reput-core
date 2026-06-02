import { NextRequest, NextResponse } from 'next/server';

export interface WPPublishRequest {
  siteUrl: string;
  username: string;
  appPassword: string;
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  category?: string;
  status: 'draft' | 'publish';
  slug?: string;
}

function toHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function authHeader(username: string, appPassword: string): string {
  return 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
}

async function resolveTermId(
  base: string,
  auth: string,
  endpoint: 'categories' | 'tags',
  name: string
): Promise<number | undefined> {
  if (!name.trim()) return undefined;

  const search = await fetch(
    `${base}/wp-json/wp/v2/${endpoint}?search=${encodeURIComponent(name)}&per_page=5`,
    { headers: { Authorization: auth } }
  );
  if (search.ok) {
    const results: { id: number; name: string }[] = await search.json();
    const exact = results.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (exact) return exact.id;
  }

  // Create if not found
  const create = await fetch(`${base}/wp-json/wp/v2/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (create.ok) {
    const created: { id: number } = await create.json();
    return created.id;
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  let body: WPPublishRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { siteUrl, username, appPassword, title, content, excerpt, tags, category, status, slug } = body;

  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: 'Missing WordPress credentials' }, { status: 400 });
  }

  const base = siteUrl.replace(/\/$/, '');
  const auth = authHeader(username, appPassword);

  // Resolve category and tag IDs in parallel
  const [categoryId, tagIds] = await Promise.all([
    category ? resolveTermId(base, auth, 'categories', category) : Promise.resolve(undefined),
    tags && tags.length > 0
      ? Promise.all(tags.slice(0, 10).map(t => resolveTermId(base, auth, 'tags', t)))
      : Promise.resolve([]),
  ]);

  const htmlContent = toHtml(content);

  const postBody: Record<string, unknown> = {
    title,
    content: htmlContent,
    status,
    ...(excerpt && { excerpt }),
    ...(slug && { slug }),
    ...(categoryId !== undefined && { categories: [categoryId] }),
    ...(tagIds && tagIds.filter(Boolean).length > 0 && { tags: tagIds.filter(Boolean) }),
  };

  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(postBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = (err as { message?: string }).message || `WordPress returned ${res.status}`;
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const post: { id: number; link: string; guid?: { rendered?: string } } = await res.json();
  const editUrl = `${base}/wp-admin/post.php?post=${post.id}&action=edit`;

  return NextResponse.json({ success: true, postId: post.id, postUrl: post.link, editUrl });
}
