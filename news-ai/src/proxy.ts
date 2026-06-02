import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GINA_URL = process.env.NEXT_PUBLIC_GINA_URL ?? 'http://localhost:3000';
const TOKEN_COOKIE = 'reput_token';

export function proxy(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Token handoff: GINA appends ?token=JWT after login → set cookie → redirect to clean URL
  const tokenFromUrl = searchParams.get('token');
  if (tokenFromUrl) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('token');
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(TOKEN_COOKIE, tokenFromUrl, {
      httpOnly: false, // must be readable by client JS for API calls
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  }

  // No session → redirect to GINA login, passing this URL as the return destination
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    const redirectBack = encodeURIComponent(request.url);
    return NextResponse.redirect(`${GINA_URL}/login?redirect=${redirectBack}`);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all pages; skip Next.js internals and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
