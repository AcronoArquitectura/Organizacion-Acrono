// Generación PDF de factura — portado de contabilidad.html (función facturaPrintHTML)
// Misma técnica: window.open() + window.print()
import type { Factura, Presupuesto } from '@/lib/types';
import { calcPartidasDef } from '@/lib/utils/coag';
import { EMISOR, BANCO } from './constants';

const esc = (s: string) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt = (n: number) => (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const pctStr = (v: number) => v ? Math.round(v * 100) + '%' : '';

function fechaCorta(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
}

function buildHTML(f: Factura, logoUrl: string, proforma = false): string {
  const baseTot = f.lines.reduce((s, l) => s + (+l.base || 0), 0);
  const ivaTot  = f.lines.reduce((s, l) => s + (+l.base || 0) * (+l.iva || 0), 0);
  const retTot  = f.lines.reduce((s, l) => s + (+l.base || 0) * (+l.irpf || 0), 0);
  const total   = baseTot + ivaTot - retTot;
  const destDir = [f.clienteDireccionCalle, f.clienteDireccionCPCiudad, f.clienteDireccionProvincia]
    .filter(Boolean).map(esc).join('<br>');

  const rows = f.lines.map((l, i) => `<tr>
    <td class="desc">${esc(l.desc || (i === 0 ? f.concepto : '')) || '&nbsp;'}</td>
    <td class="c">${pctStr(+l.iva)}</td>
    <td class="c">${pctStr(+l.irpf)}</td>
    <td class="c"></td>
    <td class="r">${fmt(+l.base)}</td>
  </tr>`).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title></title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0;}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{font-family:'Poppins',Arial,sans-serif;color:#333;font-size:11px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.doc{width:210mm;margin:0 auto;padding:15mm 13mm;}
.head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:26px;}
.head img{height:130px;width:auto;}
.head .meta{text-align:right;}
.head .meta h1{font-size:21px;font-weight:600;letter-spacing:.01em;}
.head .meta .ref{font-size:13px;font-weight:600;margin-bottom:9px;}
.head .meta .ln{font-size:10px;color:#6b6a66;max-width:260px;margin-left:auto;}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;align-items:stretch;}
.party{display:flex;flex-direction:column;}
.party .tag{font-size:10px;color:#6b6a66;margin-bottom:5px;}
.party .box{border:1px solid #333;border-radius:2px;padding:14px 15px;min-height:118px;flex:1;}
.party.emisor .box{background:#f3f1ec;}
.party .nom{font-weight:600;font-size:13px;margin-bottom:7px;}
.party .row{color:#444;}
.party .gap{height:7px;}
table{width:100%;border-collapse:collapse;margin-bottom:6px;}
thead th{font-size:11px;font-weight:600;text-align:left;padding:7px 8px;border-bottom:1.5px solid #333;}
thead th.c{text-align:center;} thead th.r{text-align:right;}
tbody td{padding:11px 8px;vertical-align:top;border-bottom:1px solid #ece9e2;}
tbody td.desc{font-weight:500;}
td.c{text-align:center;} td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
thead th:nth-child(2),thead th:nth-child(3),thead th:nth-child(4){width:62px;}
thead th:nth-child(5){width:108px;}
.pie{font-size:10px;color:#555;font-style:italic;text-align:center;max-width:420px;margin:14px auto 0;line-height:1.6;}
.foot{display:flex;justify-content:space-between;gap:24px;margin-top:26px;}
.pago{font-size:10px;color:#555;flex:1;}
.pago .lbl{color:#6b6a66;margin-bottom:5px;}
.cuenta{display:flex;border:1px solid #d0ccc4;border-radius:2px;overflow:hidden;margin:6px 0;max-width:330px;}
.cuenta div{padding:5px 8px;border-right:1px solid #e3dfd7;}
.cuenta div:last-child{border-right:none;}
.cuenta .ch{font-size:8px;color:#8a8780;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:2px;}
.totales{width:240px;flex-shrink:0;}
.totales .tr{display:flex;justify-content:space-between;padding:5px 10px;font-size:11px;color:#555;}
.totales .tr span:last-child{font-variant-numeric:tabular-nums;}
.totales .tot{background:#e9e6df;font-weight:600;font-size:15px;color:#333;padding:9px 10px;margin-top:4px;}
</style></head>
<body><div class="doc">
  <div class="head">
    <img src="${logoUrl}" alt="Ácrono arquitectura">
    <div class="meta">
      <h1>Factura${proforma ? ' <span style="color:#c0392b">PROFORMA</span>' : ''}</h1>
      <div class="ref">Ref.: ${esc(proforma ? (f.refPresupuesto || f.numero) : f.numero)}</div>
      <div class="ln">Fecha: ${fechaCorta(f.fecha)}</div>
      ${!proforma ? `<div class="ln">Fecha de vencimiento: ${fechaCorta(f.vencimiento ?? '')}</div>` : ''}
      ${!proforma && f.refPresupuesto ? `<div class="ln">Ref. Presupuesto: ${esc(f.refPresupuesto)}</div>` : ''}
    </div>
  </div>

  <div class="parties">
    <div class="party emisor">
      <div class="tag">Emisor:</div>
      <div class="box">
        <div class="nom">${esc(EMISOR.nombre)}</div>
        ${EMISOR.dir.map(l => `<div class="row">${esc(l)}</div>`).join('')}
        <div class="gap"></div>
        <div class="row">NIF: ${esc(EMISOR.nif)}</div>
        <div class="gap"></div>
        <div class="row">Teléfono: ${esc(EMISOR.tel)}</div>
        <div class="row">Correo: ${esc(EMISOR.correo)}</div>
        <div class="row">Web: ${esc(EMISOR.web)}</div>
      </div>
    </div>
    <div class="party">
      <div class="tag">Destinatario:</div>
      <div class="box">
        <div class="nom">${esc(f.cliente ?? '')}</div>
        ${destDir ? `<div class="row">${destDir}</div>` : ''}
        ${f.clienteNif ? `<div class="gap"></div><div class="row">CIF/NIF: ${esc(f.clienteNif)}</div>` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>Descripción</th><th class="c">IVA</th><th class="c">Retención</th><th class="c">Descuentos</th><th class="r">Base Imponible</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${f.pieTexto ? `<div class="pie">${esc(f.pieTexto)}</div>` : ''}

  <div class="foot">
    <div class="pago">
      <div class="lbl">Pago mediante transferencia a la cuenta bancaria siguiente</div>
      <div>Banco: ${esc(BANCO.banco)}</div>
      <div class="cuenta">
        <div><span class="ch">Cód. Banco</span>${BANCO.cb}</div>
        <div><span class="ch">Cód. Sucursal</span>${BANCO.cs}</div>
        <div><span class="ch">D.C.</span>${BANCO.dc}</div>
        <div><span class="ch">Número cuenta</span>${BANCO.cuenta}</div>
      </div>
      <div style="font-size:10px;color:#555;margin-top:14px;"><strong>Titular de la cuenta:</strong> ${esc(BANCO.titular)}</div>
      <div>Código IBAN: ${BANCO.iban}</div>
      <div>Código BIC/SWIFT: ${BANCO.bic}</div>
    </div>
    <div class="totales">
      <div class="tr"><span>Base Imponible total:</span><span>${fmt(baseTot)}</span></div>
      <div class="tr"><span>Total IVA:</span><span>${fmt(ivaTot)}</span></div>
      <div class="tr"><span>Retención total:</span><span>${retTot ? '−' + fmt(retTot) : fmt(0)}</span></div>
      <div class="tot"><div class="tr" style="padding:0;color:#333;font-size:15px;"><span>TOTAL:</span><span>${fmt(total)}</span></div></div>
    </div>
  </div>
</div></body></html>`;
}

export function openFacturaPDF(f: Factura, proforma = false): void {
  if (!f.lines?.length) { alert('Añade al menos una línea con base'); return; }
  const w = window.open('', '_blank');
  if (!w) { alert('Permite las ventanas emergentes para imprimir'); return; }
  const logoUrl = `${window.location.origin}/logotipo.png`;
  w.document.write(buildHTML(f, logoUrl, proforma));
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

export function openProformaFromPresupuesto(p: Presupuesto): void {
  const partidas = p.partidas.length > 0 ? p.partidas : calcPartidasDef(p);
  const lines = partidas
    .filter(x => (x.tipo === 'fijo' || x.tipo === 'mensual') && (x.importe ?? 0) > 0)
    .map(x => ({
      base: x.tipo === 'mensual' ? (x.importe ?? 0) * (x.meses ?? 1) : (x.importe ?? 0),
      iva: 0.21 as number,
      irpf: 0 as number,
      desc: x.concepto + (x.tipo === 'mensual' && x.meses ? ` (${x.meses} meses)` : ''),
    }));
  if (!lines.length) { alert('No hay partidas con importe en este presupuesto'); return; }
  const f: Factura = {
    id: '', numero: '', fecha: p.fecha, vencimiento: '',
    cliente: p.cliente.nombre, clienteNif: p.cliente.dni,
    clienteDireccionCalle: p.cliente.dir1,
    clienteDireccionCPCiudad: p.cliente.dir2,
    clienteDireccionProvincia: p.cliente.dir3,
    refPresupuesto: p.numero,
    pieTexto: '', concepto: p.proyecto.titulo || '',
    estado: 'pendiente', nota: '', tags: [],
    lines,
  };
  openFacturaPDF(f, true);
}
