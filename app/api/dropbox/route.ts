/**
 * Proxy server → Dropbox.
 * El navegador NUNCA llama a Dropbox directamente; siempre pasa por aquí.
 * Lee el token de la cookie httpOnly (inaccesible desde JS del navegador).
 * Gestiona el refresco automático del access_token cuando Dropbox devuelve 401.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DOWNLOAD = 'https://content.dropboxapi.com/2/files/download';
const UPLOAD   = 'https://content.dropboxapi.com/2/files/upload';
const TOKEN    = 'https://api.dropbox.com/oauth2/token';

type Op = 'download' | 'upload';

async function callDropbox(op: Op, path: string, token: string, content?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Dropbox-API-Arg': JSON.stringify(op === 'upload' ? { path, mode: 'overwrite' } : { path }),
  };
  if (op === 'upload') headers['Content-Type'] = 'application/octet-stream';

  return fetch(op === 'download' ? DOWNLOAD : UPLOAD, {
    method: 'POST',
    headers,
    body: op === 'upload' ? content : undefined,
    cache: 'no-store',
  });
}

export async function POST(req: NextRequest) {
  const jar = await cookies();
  let accessToken = jar.get('dbx_access')?.value;
  const refreshToken = jar.get('dbx_refresh')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { op, path, content } = (await req.json()) as { op: Op; path: string; content?: string };

  let res = await callDropbox(op, path, accessToken, content);

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY!,
      }),
    });

    if (!refreshRes.ok) {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }

    const { access_token: newToken } = await refreshRes.json();
    res = await callDropbox(op, path, newToken, content);
    accessToken = newToken;
  }

  if (!res.ok) {
    return NextResponse.json({ error: `Dropbox error ${res.status}` }, { status: res.status });
  }

  const text = await res.text();
  const out = NextResponse.json({ data: text });

  // Persist refreshed token
  const originalToken = jar.get('dbx_access')?.value;
  if (accessToken && accessToken !== originalToken) {
    const isProd = process.env.NODE_ENV === 'production';
    out.cookies.set('dbx_access', accessToken, {
      httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 60 * 60 * 4, path: '/',
    });
  }

  return out;
}
