'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);

    // Generate PKCE code_verifier
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const verifier = btoa(String.fromCharCode(...arr))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Generate code_challenge = SHA-256(verifier) in base64url
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Store verifier in a short-lived cookie; the callback route reads it server-side
    document.cookie = `dbx_verifier=${verifier}; path=/; max-age=600; SameSite=Lax`;

    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY!,
      redirect_uri: `${window.location.origin}/api/auth/callback`,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      token_access_type: 'offline',
    });

    window.location.href = `https://www.dropbox.com/oauth2/authorize?${params}`;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f4f0',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '40px 48px',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
          textAlign: 'center',
          width: 360,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#333',
            marginBottom: 24,
          }}
        >
          Ácrono Arquitectura
        </p>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 8 }}>
          Iniciar sesión
        </h1>
        <p style={{ fontSize: 12, color: '#a09e99', marginBottom: 32 }}>
          Conecta con tu cuenta de Dropbox para acceder a la aplicación.
        </p>
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            height: 38,
            background: loading ? '#666' : '#333',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 6,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Redirigiendo…' : 'Conectar con Dropbox'}
        </button>
      </div>
    </div>
  );
}
