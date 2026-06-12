/**
 * Capa de acceso a datos — único archivo que sabe que los datos viven en Dropbox.
 * Para migrar a Supabase en el futuro: cambia solo este archivo.
 *
 * Llamado únicamente desde Server Components, Server Actions y Route Handlers.
 * El navegador nunca llama a Dropbox directamente; usa /api/dropbox como proxy.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AcronoData } from '@/lib/types';

const DOWNLOAD = 'https://content.dropboxapi.com/2/files/download';
const UPLOAD   = 'https://content.dropboxapi.com/2/files/upload';
const TOKEN    = 'https://api.dropbox.com/oauth2/token';

export const PATH_MAIN = '/acrono_app.json';
export const PATH_ORG  = '/cronograma_acrono.json';

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getTokens() {
  const jar = await cookies();
  return {
    access:  jar.get('dbx_access')?.value  ?? null,
    refresh: jar.get('dbx_refresh')?.value ?? null,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY!,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('refresh_failed');
  const { access_token } = await res.json();

  // Update cookie (works in Server Actions and Route Handlers; no-op in Server Components)
  try {
    const jar = await cookies();
    jar.set('dbx_access', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4,
      path: '/',
    });
  } catch {
    // Server Components cannot set cookies; the proxy (/api/dropbox) handles refresh for those
  }

  return access_token as string;
}

// ── Low-level fetch helpers ───────────────────────────────────────────────────

async function download(path: string): Promise<string> {
  const { access, refresh } = await getTokens();
  if (!access) redirect('/login');

  const doFetch = (token: string) =>
    fetch(DOWNLOAD, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ path }) },
      cache: 'no-store',
    });

  let res = await doFetch(access);

  if (res.status === 401) {
    if (!refresh) redirect('/login');
    try {
      const newToken = await refreshAccessToken(refresh);
      res = await doFetch(newToken);
    } catch {
      redirect('/login');
    }
  }

  if (!res.ok) throw new Error(`Dropbox download ${path}: ${res.status}`);
  return res.text();
}

async function upload(path: string, content: string): Promise<void> {
  const { access, refresh } = await getTokens();
  if (!access) redirect('/login');

  const doFetch = (token: string) =>
    fetch(UPLOAD, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path, mode: 'overwrite' }),
        'Content-Type': 'application/octet-stream',
      },
      body: content,
      cache: 'no-store',
    });

  let res = await doFetch(access);

  if (res.status === 401) {
    if (!refresh) redirect('/login');
    try {
      const newToken = await refreshAccessToken(refresh);
      res = await doFetch(newToken);
    } catch {
      redirect('/login');
    }
  }

  if (!res.ok) throw new Error(`Dropbox upload ${path}: ${res.status}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function readAllData(): Promise<AcronoData> {
  const raw = JSON.parse(await download(PATH_MAIN));
  return {
    org: raw.org ?? { projects: [], obras: [], authors: [] },
    clientes:     raw.clientes ?? [],
    presupuestos: raw.presupuestos ?? [],
    contabilidad: {
      facturas:    raw.contabilidad?.facturas    ?? [],
      gastos:      raw.contabilidad?.gastos      ?? [],
      proveedores: raw.contabilidad?.proveedores ?? [],
      saldoBase:   raw.contabilidad?.saldoBase,
    },
  };
}

/**
 * Escribe AMBOS ficheros (nota 9.1 del inventario):
 *  - acrono_app.json    → datos completos
 *  - cronograma_acrono.json → solo data.org (sin wrapper 'org'), para compatibilidad standalone
 */
export async function writeAllData(data: AcronoData): Promise<void> {
  await Promise.all([
    upload(PATH_MAIN, JSON.stringify(data)),
    upload(PATH_ORG,  JSON.stringify(data.org)),
  ]);
}
