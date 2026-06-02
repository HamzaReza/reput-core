import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let body: { siteUrl: string; username: string; appPassword: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { siteUrl, username, appPassword } = body;

  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const base = siteUrl.replace(/\/$/, '');
  const auth = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');

  const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: auth },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = (err as { message?: string }).message || `WordPress returned ${res.status}`;
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const user: { id: number; name: string; slug: string } = await res.json();

  return NextResponse.json({ success: true, displayName: user.name, wpUsername: user.slug });
}
