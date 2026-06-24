'use server';

import type { Solicitud, Presupuesto, PemRow, EstanciaSolicitud } from '@/lib/types';
import { readSolicitudesUI, writeSolicitudesUI } from '@/lib/data/solicitudes-storage';
import { upsertPresupuesto } from '@/lib/actions/presupuestos';
import { readAllData } from '@/lib/data/storage';
import {
  nuevoPresupuestoObj, capsFor, plantillaDef,
  EXTRAS_LIST, OBSERVACIONES_SEED, DESCRIPCION_TRABAJO_DEF, fcSugerido,
} from '@/lib/utils/coag';

// ── CRUD solicitudes ──────────────────────────────────────────────────────────

export async function updateSolicitud(sol: Solicitud): Promise<Solicitud[]> {
  const all = await readSolicitudesUI();
  const idx = all.findIndex(s => s.id === sol.id);
  if (idx >= 0) all[idx] = sol; else all.push(sol);
  await writeSolicitudesUI(all);
  return all;
}

export async function deleteSolicitud(id: string): Promise<Solicitud[]> {
  const all = await readSolicitudesUI();
  const filtered = all.filter(s => s.id !== id);
  await writeSolicitudesUI(filtered);
  return filtered;
}

// ── Conversión estancias → pemRows ────────────────────────────────────────────
//
// Reglas:
//   1. Los m² en la solicitud son ÚTILES; se multiplican ×1,25 para obtener construidos.
//   2. Se agrupan por coef → un pemRow por grupo.
//   3. computaM2 = true solo para coef >= 1.0 (escala honorarios a través de I3).
//   4. Piscina: modo='manual', eurM2 fijo, computaM2=false.
//
// CALIBRAR los nombres de grupo aquí si es necesario:
const NOMBRE_GRUPO: Record<string, string> = {
  '1':   'Superficie vivienda',
  '0.8': 'Zonas complementarias',
  '0.6': 'Garaje',
  '0.5': 'Exterior',
};

function conceptoPorCoef(coef: number): string {
  const k = String(Math.round(coef * 10) / 10);
  return NOMBRE_GRUPO[k] ?? `Zona (×${coef})`;
}

function estanciasToPemRows(estancias: EstanciaSolicitud[]): PemRow[] {
  const piscs   = estancias.filter(e => e.esPiscina);
  const normales = estancias.filter(e => !e.esPiscina);

  // Acumular m² útil por coef
  const byCoef = new Map<number, number>();
  normales.forEach(e => byCoef.set(e.coef, (byCoef.get(e.coef) ?? 0) + (e.m2Util || 0)));

  // Ordenar: vivienda (coef=1.0) primero, luego descendente
  const sorted = [...byCoef.entries()].sort((a, b) => b[0] - a[0]);

  const rows: PemRow[] = sorted.map(([coef, m2Util]) => ({
    concepto:   conceptoPorCoef(coef),
    m2:         Math.round(m2Util * 1.25 * 100) / 100,
    computaM2:  coef >= 1.0,  // solo vivienda escala I3
    modo:       'auto' as const,
    coef,
    eurM2:      0,
  }));

  // Piscinas en modo manual (sin computaM2)
  piscs.forEach(p => {
    rows.push({
      concepto:  p.concepto,
      m2:        p.m2Util,
      computaM2: false,
      modo:      'manual' as const,
      coef:      0,
      eurM2:     p.eurM2Piscina,
    });
  });

  return rows;
}

// ── Título de presupuesto por defecto según tipo de proyecto ──────────────────

function tituloPorTipo(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes('reforma') || t.includes('rehabilit')) return 'Rehabilitación / Reforma';
  if (t.includes('clínica') || t.includes('clinica') || t.includes('dental') || t.includes('sanitario'))
    return 'Clínica / Centro sanitario';
  if (t.includes('local') || t.includes('oficina')) return 'Local / Oficina';
  return 'Vivienda unifamiliar';
}

// ── Generar presupuesto desde solicitud ───────────────────────────────────────
//
// Único punto de todo el intake que escribe en acrono_app.json.
// Se llama solo cuando el usuario pulsa "Generar presupuesto" (acción deliberada).

export async function generarPresupuesto(
  sol: Solicitud
): Promise<{ presupuesto: Presupuesto; solicitudes: Solicitud[] }> {
  // Lee presupuestos actuales (para numeración correlativa)
  const data = await readAllData();
  const base = nuevoPresupuestoObj(data.presupuestos);

  const pemRows = estanciasToPemRows(sol.estancias);
  const caps    = capsFor(sol.familia);

  // Sugiere fcKey a partir de m² construidos de vivienda (coef=1.0)
  const m2UtilVivienda = sol.estancias
    .filter(e => !e.esPiscina && e.coef >= 1.0)
    .reduce((s, e) => s + (e.m2Util || 0), 0);
  const fcKey = fcSugerido(m2UtilVivienda * 1.25);

  // Extrae municipio y provincia del formato "Municipio (Provincia)"
  const match     = sol.municipio_provincia.match(/^([^(]+?)(?:\s*\(([^)]+)\))?$/);
  const municipio = match?.[1]?.trim() ?? sol.municipio_provincia;
  const provincia = match?.[2]?.trim() ?? '';

  const p: Presupuesto = {
    ...base,

    // Cabecera
    id:     'p_' + Date.now(),
    fecha:  new Date().toISOString().slice(0, 10),
    estado: 'borrador',

    // Cliente (campos que no captura el formulario quedan en blanco para relleno manual)
    cliente: {
      nombre: sol.nombre,
      dni:    '',        // no capturado en el formulario
      tel:    sol.telefono,
      email:  sol.email,
      dir1:   '',        // no capturado
      dir2:   '',        // no capturado
      dir3:   provincia,
    },
    clienteRefId: null,

    // Proyecto
    proyecto: {
      titulo:          tituloPorTipo(sol.tipo_proyecto),
      servicio:        'Arquitectura',
      lugarMunicipio:  municipio,
      lugarDir:        '',   // no capturado
      refCatastral:    sol.referencia_catastral,
    },

    // Parámetros COAG (todos editados en el editor de la solicitud)
    familia:       sol.familia,
    plantilla:     sol.plantilla,
    mo:            sol.mo,
    mu:            sol.mu,
    flKey:         sol.flKey,
    ftKey:         sol.ftKey,
    fcKey,                       // sugerida en base a los m² calculados
    usoKey:        sol.usoKey,
    urbCalle:      sol.urbCalle,
    superficieRef: 0,
    complejidadK:  sol.complejidadK,
    superficieParcela: sol.m2_solar,

    // PEM generado desde estancias
    pemRows,
    capitulos: caps.map(c => ({ key: c[0], label: c[1], max: c[2], real: c[2] })),

    // Honorarios — plantillas por defecto (editables en el editor de presupuesto)
    tareas: plantillaDef(sol.plantilla),
    extras: EXTRAS_LIST.map(l => ({ label: l, aplica: false, horas: 0 })),

    // Nota interna con contexto del cliente (presupuesto y plazo que mencionó)
    notaInterna: [
      sol.presupuesto_cliente > 0
        ? `Presupuesto cliente: ${sol.presupuesto_cliente.toLocaleString('es-ES')} €`
        : '',
      sol.plazo ? `Plazo: ${sol.plazo}` : '',
    ].filter(Boolean).join(' · '),

    descripcionTrabajo:  DESCRIPCION_TRABAJO_DEF,
    observacionesSel:    OBSERVACIONES_SEED.map(o => o.id),
    observacionesCustom: [],
    ajustePct:           0,
    partidas:            [],
    fases:               ['FASE 1 · PROYECTO', 'FASE 2 · OBRA'],
  };

  // Escribe en acrono_app.json (único punto de escritura del flujo de intake)
  await upsertPresupuesto(p);

  // Marca solicitud como convertida en solicitudes_acrono.json
  const allSols = await readSolicitudesUI();
  const updatedSols = allSols.map(s =>
    s.id === sol.id
      ? { ...s, estado: 'convertida' as const, presupuestoId: p.id }
      : s
  );
  await writeSolicitudesUI(updatedSols);

  return { presupuesto: p, solicitudes: updatedSols };
}
