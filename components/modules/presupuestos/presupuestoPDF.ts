/**
 * Generación del PDF del presupuesto.
 * Estructura exacta de presupuestos.html (7 páginas).
 * Usa window.open() + window.print() — misma técnica que el original.
 */
import type { Presupuesto } from '@/lib/types';
import {
  honorariosLineas, honorariosBase, honorariosConAjuste, honorariosExtrasTotal,
  calcPartidasDef, pemTotal, rowEurM2, mcBase, capCoef, costesTotales,
  OBSERVACIONES_SEED, FL_OPTS, FT_VIV, FC_VIV,
} from '@/lib/utils/coag';

// ── Constantes ────────────────────────────────────────────────────────────────

const SEDES = {
  baza:    'C/ Antonio Machado, Residencial Al-Ándalus, Bl.8 Local 1',
  granada: 'Carretera de Málaga 119 Local 1, 18015 Granada',
  tels:    '958 965 320 / 639 075 607 / 657 486 586 / 634 785 733 / 677 876 155',
  mail:    'estudio@acronoarquitectura.com',
  web:     'www.acronoarquitectura.com',
};

const EQUIPO = [
  { nombre: 'Luis León Ortiz',              titulo: 'Arquitecto',  col: '005008', firma: 'luis' },
  { nombre: 'Marisol Valera González',      titulo: 'Arquitecta',  col: '005027', firma: 'marisol' },
  { nombre: 'Mª Cristina Guzmán Rodríguez', titulo: 'Arquitecta',  col: '540',    firma: 'cristina' },
  { nombre: 'Álvaro Pulido López Camino',   titulo: 'Arquitecto',  col: '005025', firma: 'alvaro' },
];

const FIRMAS: Record<string, string> = {
  luis:     '/firma-luis.png',
  marisol:  '/firma-marisol.png',
  cristina: '/firma-cristina.png',
  alvaro:   '/firma-alvaro.png',
};

const FORMA_PAGO_DEF = `Se abonará el 50 % de los honorarios de cada concepto que se vaya a realizar a la firma de la hoja de encargo, primera visita al inmueble o aceptación de una nueva fase; y el 50 % restante a la entrega de cada uno de ellos.
No se entregará la Documentación Final de Obra hasta que no se haya liquidado la totalidad del contrato.
Se realizará el pago de forma preferente mediante transferencia bancaria.`;

const IBAN = 'ES17-0049-4398-0526-1006-8066';

const RGPD_DEF = `Responsable: Ácrono Arquitectura S.C.P. · NIF: J19670298 · Dir. postal: C/ Antonio Machado, Residencial Al-Ándalus, Bloque 1.8, local 8.1, C.P. 18800, Baza, Granada · Tel: 657 486 586 · estudio@acronoarquitectura.com.
Tratamos la información facilitada con el fin de prestar el servicio solicitado y realizar su facturación. Los datos se conservarán mientras se mantenga la relación comercial o durante los años necesarios para cumplir las obligaciones legales y no se cederán a terceros salvo obligación legal. Puede acceder, rectificar o suprimir sus datos dirigiéndose a la dirección indicada.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

// fmt: 2 decimales (igual que presupuestos.html)
const fmt = (n: number) => (Math.round((+n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
// fmt0: 0 decimales para totales grandes
const fmt0 = (n: number) => Math.round(n).toLocaleString('es-ES') + ' €';
const esc = (s: string) => (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const mdBold = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

function fechaLarga(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function pieHTML(): string {
  return `<div class="pie">
    <div class="web">${SEDES.web}</div>
    <div class="sedes"><div><b>SEDE BAZA</b><br>${esc(SEDES.baza)}</div><div><b>SEDE GRANADA</b><br>${esc(SEDES.granada)}</div></div>
    <div class="tels">Teléfonos: ${SEDES.tels}<br>${SEDES.mail}</div>
  </div>`;
}

function pemCalcHTML(p: Presupuesto): string {
  const fl = (FL_OPTS.find(x => x.k === p.flKey) ?? { v: 1 }).v;
  let coef = '';
  if (p.familia === 'viviendas') {
    const ft = (FT_VIV.find(x => x.k === p.ftKey) ?? { v: 1 }).v;
    const fc = (FC_VIV.find(x => x.k === p.fcKey) ?? { v: 1 }).v;
    coef = `<div class="coef">
      <div>Módulo base · Mo = ${fmt0(p.mo)}/m²</div>
      <div>Mc Vivienda = Mo·Fl·Ft·Fc = <b>${fmt0(p.mo * fl * ft * fc)}/m²</b></div>
      <div>Localización · Fl = ${fl}</div><div>Tipología · Ft = ${ft}</div><div>Calidad · Fc = ${fc}</div>
      ${capCoef(p) !== 1 ? `<div>Coef. capítulos = ×${capCoef(p).toFixed(3)}</div>` : ''}</div>`;
  } else {
    coef = `<div class="coef"><div>Mc base = <b>${fmt0(mcBase(p))}/m²</b></div>${capCoef(p) !== 1 ? `<div>Coef. capítulos = ×${capCoef(p).toFixed(3)}</div>` : ''}</div>`;
  }
  const rows = p.pemRows.map(r =>
    `<tr><td class="c">${r.m2}</td><td>${esc(r.concepto)}</td><td class="r">${fmt(rowEurM2(p, r))}</td><td class="r">${fmt0((r.m2 || 0) * rowEurM2(p, r))}</td></tr>`
  ).join('');
  return `<table class="t">
    <tr class="th"><td class="c">Superficie [m²]</td><td>Concepto</td><td class="r">Precio [€/m²]</td><td class="r">Precio [€]</td></tr>
    ${rows}
    <tr class="fase-h"><td colspan="3">TOTAL PEM</td><td class="r">${fmt0(pemTotal(p))}</td></tr>
  </table>${coef}`;
}

function descripcionHTML(txt: string): string {
  const ls = String(txt || '').split('\n');
  const title = ls[0] || '';
  const rest = ls.slice(1);
  const bullets = rest.filter(l => l.trim().startsWith('•')).map(l => `<li>${mdBold(l.replace(/^\s*•\s*/, ''))}</li>`);
  const intro = rest.filter(l => l.trim() && !l.trim().startsWith('•')).map(l => `<p>${mdBold(l)}</p>`).join('');
  return `<div class="desc-title">${mdBold(title)}</div>${intro}${bullets.length ? `<ul>${bullets.join('')}</ul>` : ''}`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const PDF_CSS = `
@page{size:A4;margin:0;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Poppins',Arial,sans-serif;color:#333;}
body{font-size:10.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;min-height:297mm;padding:16mm 18mm 28mm;position:relative;page-break-after:always;}
.page:last-child{page-break-after:auto;}
.pie{position:absolute;left:18mm;right:18mm;bottom:10mm;text-align:center;font-size:8px;color:#9a968f;}
.pie .web{color:#333;font-weight:600;font-size:9px;margin-bottom:4px;}
.pie .sedes{display:flex;justify-content:center;gap:40px;margin:4px 0;} .pie .sedes b{color:#6b6a66;letter-spacing:.04em;}
/* COVER */
.cover-iso{display:block;margin:46mm auto 0;width:52mm;}
.cover-t{text-align:center;margin-top:20mm;}
.cover-t .ti{font-size:18px;font-weight:600;text-decoration:underline;letter-spacing:.05em;}
.cover-t .pj{font-size:21px;font-weight:600;margin-top:11mm;}
.cover-t .ad{font-size:11px;color:#6b6a66;margin-top:4mm;line-height:1.7;}
.cover-web{position:absolute;left:0;right:0;bottom:24mm;text-align:center;font-size:15px;font-weight:600;color:#333;letter-spacing:.04em;}
.hd{display:flex;align-items:center;justify-content:center;margin-bottom:7mm;} .hd img{height:15mm;}
.datos{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:0;border:1px solid #d7d3cb;font-size:10px;margin-bottom:8mm;}
.datos div{padding:5px 8px;border-bottom:1px solid #ece9e2;} .datos .lb{font-weight:600;background:#faf9f6;border-right:1px solid #ece9e2;white-space:nowrap;}
h2.sec{text-align:center;font-size:15px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:7mm 0 4mm;}
.pj-sub{text-align:center;font-weight:600;font-size:12px;margin-bottom:1mm;} .pem-note{text-align:center;color:#777;font-size:10px;margin-bottom:5mm;}
table.t{width:100%;border-collapse:collapse;margin-bottom:5mm;} table.t td,table.t th{border-bottom:1px solid #ece9e2;padding:7px 8px;vertical-align:top;}
table.t .r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600;} table.t .c{text-align:center;}
table.t .th td{font-weight:600;background:#faf9f6;}
.fase-h{background:#efece5;font-weight:600;text-align:center;letter-spacing:.04em;}
.est{font-style:italic;color:#9a968f;font-weight:400;}
.coef{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 10mm;font-size:9.5px;color:#555;margin:1mm 0 6mm;}
.tot-box{margin:0 auto;width:84mm;border:1px solid #d7d3cb;}
.tot-box .tr{display:flex;justify-content:space-between;padding:5px 10px;font-size:10.5px;border-bottom:1px solid #ece9e2;}
.tot-box .tr.f{background:#e9e6df;font-weight:600;font-size:13px;border-bottom:none;}
.validez{font-size:10px;color:#6b6a66;margin-top:4mm;text-align:center;}
.equipo{width:100%;border-collapse:collapse;margin-bottom:6mm;} .equipo td,.equipo th{border-bottom:1px solid #ece9e2;padding:7px 8px;text-align:center;vertical-align:middle;} .equipo th{font-weight:600;}
.equipo img{max-height:13mm;max-width:40mm;}
.desc-title{font-size:13px;font-weight:600;margin-bottom:3mm;}
ul{margin:2mm 0 4mm 6mm;} li{margin-bottom:1.5mm;} p{margin-bottom:2.5mm;} .ob-h{font-weight:600;margin-top:3mm;}
.firma{margin-top:18mm;text-align:center;} .firma .ln{border-top:1px solid #999;width:70mm;margin:16mm auto 0;}
.catastro{width:100%;border-collapse:collapse;font-size:10px;margin-top:3mm;} .catastro td,.catastro th{border-bottom:1px solid #ece9e2;padding:6px;text-align:center;}
.iban{font-size:13px;font-weight:600;text-align:center;margin:7mm 0 1mm;}
`;

// ── pdfHTML — estructura exacta de presupuestos.html ──────────────────────────

function buildHTML(p: Presupuesto, base: string): string {
  const ISOTIPO     = `${base}/isotipo3.png`;
  const ACRONO_LOGO = `${base}/logotipo.png`;
  const firmaImg = (key: string) => `${base}${FIRMAS[key] ?? ''}`;

  const ct = costesTotales(p);
  const cl = p.cliente, pr = p.proyecto;

  // Partidas: use existing or calculate default
  const partidas = p.partidas.length > 0 ? p.partidas : calcPartidasDef(p);
  const mensual = partidas.find(x => x.tipo === 'mensual');
  const partFijas = partidas.filter(x => x.tipo !== 'mensual');
  const baseFijo = partFijas.filter(x => typeof x.importe === 'number').reduce((s, x) => s + (x.importe ?? 0), 0);
  const phaseNum = (s: string) => { const m = s.match(/\d+/); return m ? +m[0] : 999; };
  const allFases = [...(p.fases?.length ? p.fases : ['FASE 1 · PROYECTO', 'FASE 2 · OBRA'])];
  partidas.forEach(x => { if (!allFases.includes(x.fase)) allFases.push(x.fase); });
  allFases.sort((a, b) => phaseNum(a) - phaseNum(b));

  const partRow = (x: typeof partidas[0]) =>
    `<tr><td>${esc(x.concepto)}</td><td class="r">${x.tipo === 'incluido' ? 'Incluido' : x.tipo === 'noincluido' ? 'NO INCLUIDO' : x.tipo === 'mensual' ? fmt0(x.importe ?? 0) + '/mes' : fmt0(x.importe ?? 0)}</td></tr>`;

  // Observations
  const allObs = [...OBSERVACIONES_SEED, ...(p.observacionesCustom ?? [])];
  const obs = allObs.filter(o => p.observacionesSel.includes(o.id));
  const obsGrupo = (g: string) => {
    const items = obs.filter(o => (o as {grupo?: string}).grupo === g);
    if (!items.length) return '';
    const head = g === 'Incluye' ? 'El presupuesto incluye:' : g === 'No incluye' ? 'El presupuesto no incluye:' : 'Otros:';
    return `<p class="ob-h">${head}</p><ul>${items.map(o => `<li>${mdBold((o as {txt?: string; text?: string}).txt ?? (o as {text?: string}).text ?? '')}</li>`).join('')}</ul>`;
  };

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title></title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>${PDF_CSS}</style></head><body>

<!-- PÁGINA 1: PORTADA -->
<div class="page">
  <img class="cover-iso" src="${ISOTIPO}">
  <div class="cover-t">
    <div class="ti">PRESUPUESTO</div>
    <div class="pj">${esc(pr.titulo || '')}</div>
    <div class="ad">${esc(pr.lugarDir || '')}${pr.lugarMunicipio ? '<br>' + esc(pr.lugarMunicipio) : ''}</div>
  </div>
  <div class="cover-web">${SEDES.web}</div>
</div>

<!-- PÁGINA 2: DATOS + PARTIDAS -->
<div class="page">
  <div class="hd"><img src="${ACRONO_LOGO}"></div>
  <div class="datos">
    <div class="lb">Nº:</div><div>${esc(p.numero)}</div><div class="lb">Fecha:</div><div>${fechaLarga(p.fecha)}</div>
    <div class="lb">Cliente:</div><div>${esc(cl.nombre)}</div><div class="lb">Dirección:</div><div>${esc([cl.dir1, cl.dir2].filter(Boolean).join(', '))}</div>
    <div class="lb">DNI/NIF:</div><div>${esc(cl.dni)}</div><div class="lb">Email:</div><div>${esc(cl.email)}</div>
    <div class="lb">Teléfono:</div><div>${esc(cl.tel)}</div><div class="lb">Servicio:</div><div>${esc(pr.servicio)}</div>
  </div>
  <div class="pj-sub">${esc(pr.titulo || '')}</div>
  <div class="pem-note">[PEM: ${fmt0(ct.pem)}]</div>
  <table class="t">
    ${allFases.map(f => `<tr class="fase-h"><td colspan="2">${esc(f)}</td></tr>${partidas.filter(x => x.fase === f).map(partRow).join('') || '<tr><td colspan="2" style="color:#999">—</td></tr>'}`).join('')}
  </table>
  <div class="tot-box">
    <div class="tr"><span>BASE IMPONIBLE</span><span>${fmt0(baseFijo)}${mensual ? ' + ' + fmt0(mensual.importe ?? 0) + '/mes' : ''}</span></div>
    <div class="tr"><span>IVA 21%</span><span>${fmt0(baseFijo * 0.21)}${mensual ? ' + ' + fmt0((mensual.importe ?? 0) * 0.21) + '/mes' : ''}</span></div>
    <div class="tr f"><span>TOTAL</span><span>${fmt0(baseFijo * 1.21)}${mensual ? ' + ' + fmt0((mensual.importe ?? 0) * 1.21) + '/mes' : ''}</span></div>
  </div>
  <div class="validez">Validez de la oferta: ${p.validezDias} días. Se revisarán los honorarios de cada fase si se pausa por causa ajena a Ácrono Arquitectura más de 6 meses, según IPC.</div>
  ${pr.refCatastral || pr.lugarMunicipio ? `<h2 class="sec">Datos lugar de actuación</h2><table class="catastro"><tr><th>Término municipal</th><th>Dirección</th><th>Ref. catastral</th></tr><tr><td>${esc(pr.lugarMunicipio)}</td><td>${esc(pr.lugarDir)}</td><td>${esc(pr.refCatastral)}</td></tr></table>` : ''}
  ${pieHTML()}
</div>

<!-- PÁGINA 3: EQUIPO + DESCRIPCIÓN -->
<div class="page">
  <div class="hd"><img src="${ACRONO_LOGO}"></div>
  <p style="font-weight:600;margin-bottom:3mm;">El trabajo será realizado por:</p>
  <table class="equipo">
    <tr><th>Profesional</th><th>Titulación</th><th>Nº colegiado</th><th>Firma</th></tr>
    ${EQUIPO.map(e => `<tr><td>${esc(e.nombre)}</td><td>${esc(e.titulo)}</td><td>${esc(e.col)}</td><td><img src="${firmaImg(e.firma)}"></td></tr>`).join('')}
  </table>
  <h2 class="sec">Descripción del trabajo</h2>
  ${descripcionHTML(p.descripcionTrabajo)}
  ${pieHTML()}
</div>

<!-- PÁGINA 4: OBSERVACIONES (solo si hay) -->
${obs.length ? `<div class="page">
  <div class="hd"><img src="${ACRONO_LOGO}"></div>
  <h2 class="sec">Observaciones</h2>
  ${obsGrupo('Incluye')}${obsGrupo('No incluye')}${obsGrupo('Otros')}
  ${pieHTML()}
</div>` : ''}

<!-- PÁGINA 5: ESTIMACIÓN DE COSTES -->
<div class="page">
  <div class="hd"><img src="${ACRONO_LOGO}"></div>
  <h2 class="sec">Estimación de costes totales</h2>
  <div class="pem-note">El Presupuesto de Ejecución Material se ha calculado mediante los baremos del Colegio Oficial de Arquitectos de Granada.</div>
  ${pemCalcHTML(p)}
  <table class="t">
    <tr class="th"><td>Concepto</td><td class="r">Precio</td></tr>
    ${ct.filas.map(f => `<tr><td>${esc(f[0] as string)} ${f[2] ? '<span class="est">Estimación</span>' : ''}</td><td class="r">${fmt0(f[1] as number)}</td></tr>`).join('')}
    <tr class="fase-h"><td>TOTAL</td><td class="r">${fmt0(ct.total)}</td></tr>
  </table>
  ${pieHTML()}
</div>

<!-- PÁGINA 6: ENTREGA + FORMA DE PAGO -->
<div class="page">
  <div class="hd"><img src="${ACRONO_LOGO}"></div>
  <h2 class="sec">Entrega del trabajo</h2>
  <p>Entregada la documentación requerida (en su caso) por parte del cliente, el plazo de duración de los trabajos será de:</p>
  <ul><li><b>A definir mediante cronograma.</b></li></ul>
  <p>Formato de entrega de los trabajos:</p>
  <ul><li><b>Se entrega copia en formato digital.</b></li></ul>
  <h2 class="sec" style="margin-top:12mm;">Forma de pago</h2>
  <p style="white-space:pre-line;">${esc(FORMA_PAGO_DEF)}</p>
  <div class="iban">Código IBAN: ${IBAN}</div>
  <div style="text-align:center;color:#6b6a66;font-style:italic;">Titular de la cuenta: Ácrono arquitectura S.C.P</div>
  ${pieHTML()}
</div>

<!-- PÁGINA 7: RGPD -->
<div class="page">
  <div class="hd"><img src="${ACRONO_LOGO}"></div>
  <h2 class="sec">RGPD · Protección de datos</h2>
  <p style="white-space:pre-line;color:#555;">${esc(RGPD_DEF)}</p>
  <div class="firma"><b>CONFORME EL CLIENTE</b> (firma/sello)<div class="ln"></div></div>
  ${pieHTML()}
</div>

</body></html>`;
}

// ── Export ────────────────────────────────────────────────────────────────────

export function openPresupuestoPDF(p: Presupuesto): void {
  const w = window.open('', '_blank');
  if (!w) { alert('Permite las ventanas emergentes para generar el PDF'); return; }
  const base = window.location.origin;
  w.document.write(buildHTML(p, base));
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}
