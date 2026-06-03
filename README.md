# Ácrono Arquitectura — Aplicación de gestión

Aplicación web de gestión interna de Ácrono Arquitectura.

**Stack**: Next.js 15 · App Router · TypeScript · Tailwind CSS  
**Datos**: Dropbox (dos archivos JSON)  
**Despliegue**: Vercel

---

## Desarrollo local

```bash
npm install
npm run dev   # http://localhost:3000
npm run build # verificar compilación
```

## Variables de entorno

### `.env.local` (desarrollo local — ya incluido, no subir a git)

```
NEXT_PUBLIC_DROPBOX_APP_KEY=0zijvfkeso3m5lb
NEXT_PUBLIC_DROPBOX_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### Vercel → Settings → Environment Variables (producción)

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_DROPBOX_APP_KEY` | `0zijvfkeso3m5lb` |
| `NEXT_PUBLIC_DROPBOX_REDIRECT_URI` | `https://organizacion-acrono.vercel.app/api/auth/callback` |

### Dropbox App Console — paso obligatorio antes de la Fase 2

Hay que añadir la URL de callback en la consola de desarrollador de Dropbox:

1. Ve a [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)
2. Selecciona la app `0zijvfkeso3m5lb`
3. En **OAuth 2 → Redirect URIs** añade:
   - `https://organizacion-acrono.vercel.app/api/auth/callback`
   - `http://localhost:3000/api/auth/callback` (para desarrollo local)

---

## Estructura del proyecto

```
app/
  layout.tsx                  # Layout raíz con TopBar
  page.tsx                    # Dashboard (/)
  login/page.tsx              # Pantalla de login Dropbox
  test-datos/page.tsx         # Verificación temporal de datos (eliminar en Fase 3)
  clientes/page.tsx
  presupuestos/page.tsx
  contabilidad/page.tsx
  organizacion/page.tsx
  globals.css
  api/
    auth/callback/route.ts    # OAuth PKCE callback → guarda tokens en cookies httpOnly
    dropbox/route.ts          # Proxy servidor→Dropbox (el navegador nunca llama a Dropbox)

middleware.ts                 # Protege todas las rutas; redirige a /login si no hay sesión

components/
  shared/TopBar.tsx
  modules/                    # Componentes por módulo (Fase 3+)

lib/
  types.ts                    # Interfaces TypeScript de todas las entidades
  data/
    storage.ts                # ÚNICO archivo que sabe que los datos viven en Dropbox
    organizacion.ts           # getOrg() / saveOrg()
    clientes.ts               # getClientes() / saveClientes()
    presupuestos.ts           # getPresupuestos() / savePresupuestos()
    facturas.ts               # getFacturas() / saveFacturas()
    gastos.ts                 # getGastos() / saveGastos()
    proveedores.ts            # getProveedores() / saveProveedores()
```

---

## Flujo de autenticación (OAuth PKCE)

1. Sin sesión → middleware redirige a `/login`
2. Usuario pulsa "Conectar con Dropbox"
3. El cliente genera `code_verifier` + `code_challenge` (SHA-256)
4. Guarda el verifier en una cookie de 10 min y redirige a Dropbox
5. Dropbox redirige a `/api/auth/callback?code=...`
6. El callback intercambia el code por `access_token` + `refresh_token`
7. Tokens guardados en cookies **httpOnly** (inaccesibles desde JS del navegador)
8. Refresco automático del token cuando Dropbox devuelve 401

---

## Fases de migración

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Inspección — inventario de `acrono.html` | ✅ Completada |
| 1 | Esqueleto: Next.js + navegación + Vercel | ✅ Completada |
| 2 | Capa Dropbox: OAuth PKCE + lectura/escritura JSON | ✅ Esta fase |
| 3a | Módulo Organización (Gantt con datos reales) | Pendiente |
| 3b | Módulo Clientes | Pendiente |
| 3c | Módulo Contabilidad | Pendiente |
| 3d | Módulo Presupuestos + calculadora COAG | Pendiente |
| 3e | Módulo Dashboard | Pendiente |
| 4 | Cierre: URL canónica, eliminar páginas de test | Pendiente |
