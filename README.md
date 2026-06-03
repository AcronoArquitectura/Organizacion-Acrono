# Ácrono Arquitectura — Aplicación de gestión

Aplicación web de gestión interna de Ácrono Arquitectura.

**Stack**: Next.js 15 · App Router · TypeScript · Tailwind CSS  
**Datos**: Dropbox (dos archivos JSON)  
**Despliegue**: Vercel

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo en http://localhost:3000
npm run dev

# Compilar para producción
npm run build
```

## Despliegue en Vercel

### 1. Instalar dependencias y verificar build local

```bash
npm install
npm run build
```

### 2. Push al repositorio GitHub

```bash
git add .
git commit -m "Fase 1: esqueleto Next.js"
git push origin main
```

### 3. Conectar a Vercel

1. Ve a **[vercel.com](https://vercel.com)** e inicia sesión (puedes usar tu cuenta de GitHub).
2. Haz clic en **Add New → Project**.
3. Importa el repositorio `AcronoArquitectura/Organizacion-Acrono`.
4. Vercel detectará automáticamente que es un proyecto Next.js. **No cambies nada** — la configuración por defecto es correcta.
5. Haz clic en **Deploy**.
6. En ~2 minutos tendrás una URL del tipo `https://organizacion-acrono.vercel.app`.

### 4. Variables de entorno (Fase 2 — pendiente)

Cuando se implemente la capa Dropbox, añadir en Vercel → Settings → Environment Variables:

| Variable | Valor |
|----------|-------|
| `DROPBOX_APP_KEY` | `0zijvfkeso3m5lb` |
| `DROPBOX_REDIRECT_URI` | `https://<tu-dominio>.vercel.app/api/auth/callback` |

---

## Estructura del proyecto

```
app/                   # Rutas (Next.js App Router)
  layout.tsx           # Layout raíz con TopBar de navegación
  page.tsx             # Dashboard (/)
  clientes/page.tsx    # Módulo Clientes
  presupuestos/page.tsx
  contabilidad/page.tsx
  organizacion/page.tsx
  globals.css          # Variables CSS + Tailwind base

components/
  shared/
    TopBar.tsx         # Barra de navegación superior (client component)
  modules/             # Componentes específicos por módulo (Fase 3+)

lib/
  types.ts             # Interfaces TypeScript de todas las entidades

public/                # Assets estáticos
```

---

## Módulos

| Ruta | Módulo | Estado |
|------|--------|--------|
| `/` | Dashboard | Placeholder |
| `/clientes` | Clientes | Placeholder |
| `/presupuestos` | Presupuestos | Placeholder |
| `/contabilidad` | Contabilidad | Placeholder |
| `/organizacion` | Organización | Placeholder |

---

## Fases de migración

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Inspección — inventario de `acrono.html` | ✅ Completada |
| 1 | Esqueleto: Next.js + navegación + Vercel | ✅ Esta fase |
| 2 | Capa Dropbox: OAuth PKCE + lectura/escritura JSON | Pendiente |
| 3a | Módulo Organización (datos reales desde Dropbox) | Pendiente |
| 3b | Módulo Clientes | Pendiente |
| 3c | Módulo Contabilidad | Pendiente |
| 3d | Módulo Presupuestos + calculadora COAG | Pendiente |
| 3e | Módulo Dashboard | Pendiente |
| 4 | Cierre: migración de datos legacy, URL canónica | Pendiente |
