import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=cancelled', req.url));
  }

  const verifier = req.cookies.get('dbx_verifier')?.value;
  if (!verifier) {
    return NextResponse.redirect(new URL('/login?error=verifier_missing', req.url));
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY!,
      redirect_uri: new URL('/api/auth/callback', req.url).href,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/login?error=token_exchange', req.url));
  }

  const { access_token, refresh_token } = await tokenRes.json();
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };

  const res = NextResponse.redirect(new URL('/', req.url));
  res.cookies.set('dbx_access', access_token, { ...cookieOpts, maxAge: 60 * 60 * 4 });
  res.cookies.set('dbx_refresh', refresh_token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  res.cookies.delete('dbx_verifier');

  return res;
}
