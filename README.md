# Ácrono Arquitectura — Aplicación de gestión

Aplicación web de gestión interna de Ácrono Arquitectura: presupuestos, facturación, gastos, organización de proyectos y obras, y dashboard de estado del estudio.

**Stack:** Next.js 15 · App Router · TypeScript  
**Datos:** Dropbox (JSON) — preparada para migrar a Supabase  
**Despliegue:** Vercel — push a `main` → deploy automático  
**Producción:** https://organizacion-acrono.vercel.app

---

## Arranque en local

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # verificar compilación sin errores
npx tsc --noEmit # verificar tipos
```

### Variables de entorno necesarias

Crea un archivo `.env.local` en la raíz del proyecto (no se sube a git):

```
NEXT_PUBLIC_DROPBOX_APP_KEY=<app key de la consola Dropbox>
```

La `redirect_uri` **no** va en `.env.local`: la app la calcula automáticamente desde `window.location.origin` en el navegador y desde las cookies en el servidor.

> **Dropbox App Console:** asegúrate de que `https://organizacion-acrono.vercel.app/api/auth/callback` y `http://localhost:3000/api/auth/callback` están en la lista de Redirect URIs de la app en [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps).

---

## Arquitectura

### Estructura de carpetas

```
acrono-app/
├── app/
│   ├── layout.tsx                    # Layout raíz — TopBar + fuente Poppins
│   ├── page.tsx                      # Dashboard (/) — Server Component
│   ├── login/page.tsx                # Login con Dropbox (PKCE)
│   ├── clientes/page.tsx             # Módulo Clientes
│   ├── presupuestos/page.tsx         # Módulo Presupuestos
│   ├── contabilidad/page.tsx         # Módulo Contabilidad
│   ├── organizacion/page.tsx         # Módulo Organización
│   └── api/
│       ├── auth/callback/route.ts    # OAuth callback — guarda tokens en cookies httpOnly
│       └── dropbox/route.ts          # Proxy servidor→Dropbox (el navegador nunca llama a Dropbox)
│
├── middleware.ts                      # Protege todas las rutas; redirige a /login si no hay sesión
│
├── components/
│   ├── shared/
│   │   └── TopBar.tsx                # Barra de navegación superior
│   └── modules/
│       ├── dashboard/
│       │   └── DashboardView.tsx     # Server Component — KPIs, gráfica SVG, tabla proyectos
│       ├── clientes/                 # ClientesView, Sidebar, Ficha, Resumen, Modal
│       ├── presupuestos/             # PresupuestosView, Editor, Summary, PDF (jsPDF)
│       ├── contabilidad/             # View, tabs Facturas/Gastos/Proveedores/Resultados/Gráficas
│       └── organizacion/             # Gantts, modales Proyecto/Obra/Autores, PDF exports
│
└── lib/
    ├── types.ts                       # Interfaces TypeScript de todas las entidades
    ├── data/
    │   ├── storage.ts                 # ★ Único punto de contacto con Dropbox (ver más abajo)
    │   ├── organizacion.ts            # getOrg() / saveOrg()
    │   ├── clientes.ts                # getClientes() / saveClientes()
    │   ├── presupuestos.ts            # getPresupuestos() / savePresupuestos()
    │   ├── facturas.ts                # getFacturas() / saveFacturas()
    │   ├── gastos.ts                  # getGastos() / saveGastos()
    │   └── proveedores.ts             # getProveedores() / saveProveedores()
    ├── actions/
    │   ├── organizacion.ts            # Server Actions — upsertProyecto, deleteObra, etc.
    │   ├── clientes.ts                # Server Actions — upsertCliente, deleteCliente
    │   └── presupuestos.ts            # Server Actions — upsertPresupuesto, etc.
    └── utils/
        ├── gantt.ts                   # PHASE_DEFS, semanas, clipBar, buildMonthGroups
        ├── phases.ts                  # getCurrentPhase(), getPhaseProgress()
        └── coag.ts                    # honorariosConAjuste() — baremo COAG
```

### Qué hace cada capa

| Capa | Responsabilidad |
|------|----------------|
| `app/*/page.tsx` | Server Components — obtienen datos y pasan props al View |
| `components/modules/*/View.tsx` | Client Components — estado UI, interacción usuario |
| `lib/data/*.ts` | Funciones de lectura/escritura (llamadas solo desde servidor) |
| `lib/actions/*.ts` | Server Actions — mutaciones invocadas desde Client Components |
| `lib/utils/*.ts` | Cálculos puros compartidos entre módulos |
| `app/api/dropbox/route.ts` | Proxy — única salida de red hacia Dropbox desde el cliente |

### Flujo de datos (lectura)

```
page.tsx (Server) → lib/data/X.ts → lib/data/storage.ts → Dropbox (servidor)
                                                             ↓
                                                      props → XView (Client)
```

### Flujo de datos (escritura)

```
XView (Client) → Server Action (lib/actions/) → storage.ts → Dropbox
                                                      ↓
                                              estado actualizado devuelto
```

### Flujo de autenticación (OAuth PKCE)

1. Sin sesión → `middleware.ts` redirige a `/login`
2. `login/page.tsx` genera `code_verifier` + `code_challenge` (SHA-256, PKCE), guarda el verifier en una cookie de 10 min y redirige al endpoint OAuth de Dropbox
3. Dropbox redirige a `/api/auth/callback?code=...`
4. El callback intercambia el code + verifier por `access_token` + `refresh_token`
5. Tokens guardados en cookies **httpOnly, Secure, SameSite=Lax** (inaccesibles desde JS)
6. Refresco automático: cuando Dropbox devuelve 401, `storage.ts` y el proxy renuevan el token transparentemente

---

## Despliegue

El repositorio está conectado a Vercel. Cada push a `main` dispara un deploy automático.

**Variables de entorno en Vercel** (Settings → Environment Variables):

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_DROPBOX_APP_KEY` | App key de la consola Dropbox |

No se necesitan más variables de entorno — `redirect_uri` se calcula en tiempo de ejecución.

---

## Añadir un módulo nuevo

1. **Tipo:** añade las interfaces en `lib/types.ts` (solo añadir, nunca romper los existentes).
2. **Datos:** crea `lib/data/nuevo.ts` con `getNuevo()` y `saveNuevo()` usando `readAllData`/`writeAllData` de `storage.ts`.
3. **Mutaciones:** crea `lib/actions/nuevo.ts` con Server Actions marcados con `'use server'`.
4. **UI:** crea `components/modules/nuevo/NuevoView.tsx` con `'use client'`.
5. **Ruta:** crea `app/nuevo/page.tsx` (Server Component) que llame a `getNuevo()` y renderice `<NuevoView>`.
6. **Navegación:** añade la ruta en `components/shared/TopBar.tsx`.
7. Verifica: `npm run build` y `npx tsc --noEmit` sin errores.

---

## Dónde viven los datos

Los datos se almacenan en dos archivos JSON en Dropbox:

| Archivo | Contenido |
|---------|-----------|
| `acrono_app.json` | Todos los datos: org, clientes, presupuestos, contabilidad |
| `cronograma_acrono.json` | Solo `org` (proyectos, obras, autores) — compatibilidad con `acrono.html` |

El único punto de acceso es `lib/data/storage.ts`. Ningún otro archivo sabe que los datos viven en Dropbox. Este archivo llama directamente a la API de Dropbox desde el servidor (Server Components y Server Actions). Desde el cliente, las mutaciones pasan siempre por el proxy `/api/dropbox`.

### Migración futura a Supabase

Para migrar el almacenamiento: **cambia únicamente `lib/data/storage.ts`**. Las funciones públicas del módulo son `readAllData()` y `writeAllData(data)`. El resto del código — módulos, actions, tipos — no necesita ningún cambio.

Pasos orientativos:
1. Sustituir `download()` y `upload()` por llamadas al cliente de Supabase.
2. Añadir `SUPABASE_URL` y `SUPABASE_ANON_KEY` como variables de entorno.
3. Eliminar el proxy `/api/dropbox` y el Route Handler `/api/auth/callback` (la auth la gestiona Supabase).
4. Eliminar el middleware de cookies de tokens Dropbox.

---

## Red de seguridad: `acrono.html`

El archivo `acrono.html` (versión anterior completa de la aplicación) se mantiene en el repositorio de forma intencionada como red de seguridad hasta que el equipo confirme que la migración es estable. **No retirarlo hasta confirmación explícita.**

---

## Módulos implementados

| Módulo | Ruta | Estado |
|--------|------|--------|
| Dashboard | `/` | ✅ Completo |
| Clientes | `/clientes` | ✅ Completo |
| Presupuestos | `/presupuestos` | ✅ Completo |
| Contabilidad | `/contabilidad` | ✅ Completo |
| Organización | `/organizacion` | ✅ Completo |
