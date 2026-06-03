/**
 * Genera el PDF del presupuesto como HTML imprimible.
 * Misma técnica que el acrono.html original: abre una ventana nueva y llama a window.print().
 */
import type { Presupuesto } from '@/lib/types';
import {
  honorariosLineas, honorariosBase, honorariosConAjuste,
  calcPartidasDef, pemTotal, rowEurM2, mcBase, capCoef,
  OBSERVACIONES_SEED, FL_OPTS, FT_VIV, FC_VIV,
} from '@/lib/utils/coag';

const SEDES = {
  baza:    'C/ Antonio Machado, Residencial Al-Ándalus, Bl.8 Local 1',
  granada: 'Carretera de Málaga 119 Local 1, 18015 Granada',
  tels:    '958 965 320 / 639 075 607 / 657 486 586 / 634 785 733 / 677 876 155',
  mail:    'estudio@acronoarquitectura.com',
  web:     'www.acronoarquitectura.com',
};

const fmt0 = (n: number) => Math.round(n).toLocaleString('es-ES') + ' €';
const esc = (s: string) => (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const mdBold = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

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
      <div>Mc = Mo·Fl·Ft·Fc = <b>${fmt0(p.mo * fl * ft * fc)}/m²</b></div>
      <div>Localización · Fl = ${fl}</div><div>Tipología · Ft = ${ft}</div><div>Calidad · Fc = ${fc}</div>
      ${capCoef(p) !== 1 ? `<div>Coef. capítulos = ×${capCoef(p).toFixed(3)}</div>` : ''}</div>`;
  } else {
    coef = `<div class="coef"><div>Mc base = <b>${fmt0(mcBase(p))}/m²</b></div>${capCoef(p) !== 1 ? `<div>Coef. capítulos = ×${capCoef(p).toFixed(3)}</div>` : ''}</div>`;
  }
  const rows = p.pemRows.map(r =>
    `<tr><td class="c">${r.m2}</td><td>${esc(r.concepto)}</td><td class="r">${fmt0(rowEurM2(p, r))}</td><td class="r">${fmt0((r.m2 || 0) * rowEurM2(p, r))}</td></tr>`
  ).join('');
  return `<table class="t">
    <tr class="th"><td class="c">Superficie [m²]</td><td>Concepto</td><td class="r">Precio [€/m²]</td><td class="r">Precio [€]</td></tr>
    ${rows}
    <tr class="fase-h"><td colspan="3">TOTAL PEM</td><td class="r">${fmt0(pemTotal(p))}</td></tr>
  </table>${coef}`;
}

function honHTML(p: Presupuesto): string {
  const L = honorariosLineas(p);
  const base = honorariosBase(p);
  const conAjuste = honorariosConAjuste(p);
  const iva = conAjuste * 0.21;
  const total = conAjuste + iva;
  const rows = L.map(l => {
    const imp = l.tipo === 'mensual' ? l.importe * (l.meses ?? 0) : l.importe;
    const tag = l.tipo === 'mensual' ? ` <span class="est">(${fmt0(l.importe)}/mes × ${l.meses} meses)</span>` : '';
    return `<tr><td>${esc(l.label)}${tag}</td><td class="r">${fmt0(imp)}</td></tr>`;
  }).join('');
  const ajusteRow = p.ajustePct
    ? `<tr><td>Ajuste ${p.ajustePct > 0 ? '+' : ''}${p.ajustePct}%</td><td class="r">${fmt0(conAjuste - base)}</td></tr>
       <tr><td><b>Base ajustada</b></td><td class="r"><b>${fmt0(conAjuste)}</b></td></tr>`
    : '';
  return `<table class="t"><tr class="th"><td>Concepto</td><td class="r">Importe</td></tr>
    ${rows}
    <tr style="background:#f5f4f0"><td><b>Total honorarios s/IVA</b></td><td class="r"><b>${fmt0(base)}</b></td></tr>
    ${ajusteRow}</table>
    <div class="tot-box">
      <div class="tr"><span>Honorarios s/IVA</span><span>${fmt0(conAjuste)}</span></div>
      <div class="tr"><span>IVA 21%</span><span>${fmt0(iva)}</span></div>
      <div class="tr f"><span>TOTAL</span><span>${fmt0(total)}</span></div>
    </div>
    <div class="validez">Presupuesto válido durante ${p.validezDias} días desde la fecha de emisión.</div>`;
}

function partidasHTML(p: Presupuesto): string {
  const parts = p.partidas.length > 0 ? p.partidas : calcPartidasDef(p);
  const fases = [...new Set(parts.map(x => x.fase))];
  fases.sort((a, b) => {
    const n = (s: string) => { const m = s.match(/\d+/); return m ? +m[0] : 999; };
    return n(a) - n(b);
  });
  return fases.map(f => {
    const rows = parts.filter(x => x.fase === f).map(x => {
      const val = x.tipo === 'incluido' ? 'Incluido'
        : x.tipo === 'noincluido' ? 'NO INCLUIDO'
        : x.tipo === 'mensual' ? `${fmt0(x.importe ?? 0)}/mes`
        : fmt0(x.importe ?? 0);
      return `<tr><td>${esc(x.concepto)}</td><td class="r">${val}</td></tr>`;
    }).join('');
    return `<tr class="fase-h"><td colspan="2">${esc(f)}</td></tr>${rows}`;
  }).join('');
}

function obsHTML(p: Presupuesto): string {
  const all = [...OBSERVACIONES_SEED, ...(p.observacionesCustom ?? [])];
  const sel = all.filter(o => p.observacionesSel.includes(o.id));
  const grupo = (g: string) => {
    const items = sel.filter(o => o.grupo === g);
    if (!items.length) return '';
    const head = g === 'Incluye' ? 'El presupuesto incluye:' : g === 'No incluye' ? 'El presupuesto no incluye:' : 'Otros:';
    return `<p class="ob-h">${head}</p><ul>${items.map(o => { const t = (o as {txt?:string;text?:string}).txt ?? (o as {text?:string}).text ?? ''; return `<li>${mdBold(t)}</li>`; }).join('')}</ul>`;
  };
  return grupo('Incluye') + grupo('No incluye') + grupo('Otros');
}

function buildHTML(p: Presupuesto): string {
  const cl = p.cliente;
  const pr = p.proyecto;
  const base = honorariosBase(p);
  const conAjuste = honorariosConAjuste(p);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Poppins',Arial,sans-serif;color:#333;}
body{font-size:10.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;min-height:297mm;padding:16mm 18mm 28mm;position:relative;page-break-after:always;}
.page:last-child{page-break-after:auto;}
.pie{position:absolute;left:18mm;right:18mm;bottom:10mm;text-align:center;font-size:8px;color:#9a968f;}
.pie .web{color:#333;font-weight:600;font-size:9px;margin-bottom:4px;}
.pie .sedes{display:flex;justify-content:center;gap:40px;margin:4px 0;}
.cover-t{text-align:center;margin-top:50mm;}
.cover-t .ti{font-size:18px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
.cover-t .logo{font-size:28px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:16mm;}
.cover-t .pj{font-size:21px;font-weight:600;margin-top:11mm;}
.cover-t .ad{font-size:11px;color:#6b6a66;margin-top:4mm;line-height:1.7;}
.hd{font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-align:center;margin-bottom:7mm;}
.datos{display:grid;grid-template-columns:auto 1fr auto 1fr;border:1px solid #d7d3cb;font-size:10px;margin-bottom:8mm;}
.datos div{padding:5px 8px;border-bottom:1px solid #ece9e2;}
.datos .lb{font-weight:600;background:#faf9f6;border-right:1px solid #ece9e2;white-space:nowrap;}
h2.sec{text-align:center;font-size:15px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:7mm 0 4mm;}
.pj-sub{text-align:center;font-weight:600;font-size:12px;margin-bottom:1mm;}
table.t{width:100%;border-collapse:collapse;margin-bottom:5mm;}
table.t td{border-bottom:1px solid #ece9e2;padding:7px 8px;vertical-align:top;}
table.t .r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600;}
table.t .c{text-align:center;}
table.t .th td{font-weight:600;background:#faf9f6;}
.fase-h{background:#efece5;font-weight:600;text-align:center;letter-spacing:.04em;}
.est{font-style:italic;color:#9a968f;font-weight:400;}
.coef{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 10mm;font-size:9.5px;color:#555;margin:1mm 0 6mm;}
.tot-box{margin:0 auto;width:84mm;border:1px solid #d7d3cb;}
.tot-box .tr{display:flex;justify-content:space-between;padding:5px 10px;font-size:10.5px;border-bottom:1px solid #ece9e2;}
.tot-box .tr.f{background:#e9e6df;font-weight:600;font-size:13px;border-bottom:none;}
.validez{font-size:10px;color:#6b6a66;margin-top:4mm;text-align:center;}
.ob-h{font-weight:600;margin-top:3mm;margin-bottom:1mm;}
ul{margin:2mm 0 4mm 6mm;}li{margin-bottom:1.5mm;}p{margin-bottom:2.5mm;}
</style></head><body>

<div class="page">
  <div class="cover-t">
    <div class="logo">Ácrono Arquitectura</div>
    <div class="ti">Presupuesto de honorarios</div>
    <div class="pj">${esc(pr.titulo || '')}</div>
    <div class="ad">${esc(pr.lugarDir || '')}${pr.lugarMunicipio ? '<br>' + esc(pr.lugarMunicipio) : ''}</div>
  </div>
  ${pieHTML()}
</div>

<div class="page">
  <div class="hd">Ácrono Arquitectura S.C.P.</div>
  <div class="datos">
    <div class="lb">Nº Presupuesto</div><div>${esc(p.numero)}</div>
    <div class="lb">Fecha</div><div>${esc(p.fecha)}</div>
    <div class="lb">Cliente</div><div>${esc(cl.nombre)}</div>
    <div class="lb">NIF/CIF</div><div>${esc(cl.dni)}</div>
    <div class="lb">Dirección</div><div>${[cl.dir1, cl.dir2, cl.dir3].filter(Boolean).map(esc).join(', ')}</div>
    <div class="lb">Validez</div><div>${p.validezDias} días</div>
    <div class="lb">Proyecto</div><div>${esc(pr.titulo)}</div>
    <div class="lb">Municipio</div><div>${esc(pr.lugarMunicipio)}</div>
  </div>

  <h2 class="sec">Cálculo del PEM</h2>
  <p class="pj-sub">${esc(pr.titulo || '')}</p>
  ${pemCalcHTML(p)}
  ${pieHTML()}
</div>

<div class="page">
  <h2 class="sec">Honorarios</h2>
  ${honHTML(p)}
  ${pieHTML()}
</div>

<div class="page">
  <h2 class="sec">Plan de cobro</h2>
  <table class="t">
    <tr class="th"><td>Concepto</td><td class="r">Importe</td></tr>
    ${partidasHTML(p)}
  </table>

  <h2 class="sec">Observaciones</h2>
  ${obsHTML(p)}
  ${pieHTML()}
</div>

</body></html>`;
}

export function openPresupuestoPDF(p: Presupuesto): void {
  const w = window.open('', '_blank');
  if (!w) { alert('Permite las ventanas emergentes para generar el PDF'); return; }
  w.document.write(buildHTML(p));
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}
