/**
 * Almacén de solicitudes Jotform — archivo separado de acrono_app.json.
 * Ruta en Dropbox: /solicitudes_acrono.json
 *
 * Dos rutas de autenticación:
 *   - Sistema (webhook Jotform): usa env var DROPBOX_REFRESH_TOKEN — sin cookies
 *   - UI (server actions, server components): usa cookies de sesión del usuario
 *
 * Env vars necesarias:
 *   DROPBOX_REFRESH_TOKEN   — refresh token de larga duración para el webhook
 *   NEXT_PUBLIC_DROPBOX_APP_KEY — ya existe en el proyecto
 */

import { cookies } from 'next/headers';
import type { Solicitud } from '@/lib/types';

const DOWNLOAD  = 'https://content.dropboxapi.com/2/files/download';
const UPLOAD    = 'https://content.dropboxapi.com/2/files/upload';
const TOKEN_URL = 'https://api.dropbox.com/oauth2/token';
const PATH      = '/solicitudes_acrono.json';

// ── Helpers de Dropbox ────────────────────────────────────────────────────────

async function doRefresh(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY!,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`dropbox_refresh_failed: ${res.status}`);
  const { access_token } = await res.json();
  return access_token as string;
}

async function dbxDownload(accessToken: string): Promise<string | null> {
  const res = await fetch(DOWNLOAD, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: PATH }),
    },
    cache: 'no-store',
  });
  // 409 = path not found → primer uso, devuelve array vacío
  if (res.status === 409) return null;
  if (!res.ok) throw new Error(`solicitudes_download_failed: ${res.status}`);
  return res.text();
}

async function dbxUpload(accessToken: string, content: string): Promise<void> {
  const res = await fetch(UPLOAD, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: PATH, mode: 'overwrite' }),
      'Content-Type': 'application/octet-stream',
    },
    body: content,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`solicitudes_upload_failed: ${res.status}`);
}

function parseSolicitudes(raw: string | null): Solicitud[] {
  if (!raw) return [];
  try { return JSON.parse(raw) ?? []; } catch { return []; }
}

// ── Ruta sistema (webhook) — usa DROPBOX_REFRESH_TOKEN ────────────────────────

export async function readSolicitudesSystem(): Promise<Solicitud[]> {
  const rt = process.env.DROPBOX_REFRESH_TOKEN;
  if (!rt) throw new Error('Env var DROPBOX_REFRESH_TOKEN no configurada');
  const token = await doRefresh(rt);
  return parseSolicitudes(await dbxDownload(token));
}

export async function writeSolicitudesSystem(data: Solicitud[]): Promise<void> {
  const rt = process.env.DROPBOX_REFRESH_TOKEN;
  if (!rt) throw new Error('Env var DROPBOX_REFRESH_TOKEN no configurada');
  const token = await doRefresh(rt);
  await dbxUpload(token, JSON.stringify(data));
}

// ── Ruta UI (server actions / server components) — usa cookies ────────────────

async function getUIToken(): Promise<string> {
  const jar = await cookies();
  let access  = jar.get('dbx_access')?.value  ?? null;
  const refresh = jar.get('dbx_refresh')?.value ?? null;
  if (!access && !refresh) throw new Error('Sesión Dropbox no encontrada');
  if (!access && refresh) {
    access = await doRefresh(refresh);
    try {
      jar.set('dbx_access', access, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 4,
        path: '/',
      });
    } catch {
      // Server Components no pueden hacer set-cookie; no es error
    }
  }
  return access!;
}

export async function readSolicitudesUI(): Promise<Solicitud[]> {
  const token = await getUIToken();
  let raw = await dbxDownload(token);
  if (raw === null) {
    // Reintenta con refresh si expiró el access
    const jar = await cookies();
    const refresh = jar.get('dbx_refresh')?.value;
    if (refresh) {
      const newToken = await doRefresh(refresh);
      raw = await dbxDownload(newToken);
    }
  }
  return parseSolicitudes(raw);
}

export async function writeSolicitudesUI(data: Solicitud[]): Promise<void> {
  const token = await getUIToken();
  await dbxUpload(token, JSON.stringify(data));
}
