import type { Factura, Gasto, Presupuesto } from '@/lib/types';
import { formatearMoneda } from '@/lib/utils/formato';
import type { OrgData } from '@/lib/data/organizacion';
import { recBase, recTotal, yearOf, fechaCorta } from '@/components/modules/contabilidad/calculos';
import { esFacturaReal } from '@/lib/utils/facturas';
import { getCurrentPhase, getPhaseProgress } from '@/lib/utils/phases';
import { honorariosConAjuste } from '@/lib/utils/coag';

interface Props {
  facturas: Factura[];
  gastos: Gasto[];
  org: OrgData;
  presupuestos: Presupuesto[];
  saldoBase?: { importe: number; fecha: string };
}

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function niceMax(v: number): number {
  if (v <= 0) return 10000;
  const steps = [5000, 10000, 20000, 25000, 50000, 75000, 100000, 150000, 200000, 500000];
  const target = v * 1.1;
  return steps.find(s => s >= target) ?? Math.ceil(target / 100000) * 100000;
}

function delta(cur: number, prev: number): { pct: number; up: boolean } | null {
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 8, padding: '16px 18px', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#6b6a66', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 13 }}>
      {children}
    </div>
  );
}

function KPICard({ label, value, badge, note, valueColor }: {
  label: string;
  value: string;
  badge?: { pct: number; up: boolean } | null;
  note?: string;
  valueColor?: string;
}) {
  return (
    <div style={{ flex: '1 1 170px', minWidth: 140, background: '#fff', border: '1px solid #e0ddd5', borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: '#a09e99', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: valueColor ?? '#333', lineHeight: 1, marginBottom: 5 }}>{value}</div>
      {badge != null ? (
        <div style={{ fontSize: 10, color: badge.up ? '#2e7d46' : '#c0392b' }}>
          {badge.up ? '↑' : '↓'} {badge.pct}%{note ? ' ' + note : ''}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: '#a09e99' }}>{note ?? ''}</div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardView({ facturas, gastos, org, presupuestos, saldoBase }: Props) {
  const now = new Date();
  const CY = now.getFullYear();
  const PY = CY - 1;
  const CM = now.getMonth(); // 0-indexed, for same-period YTD comparison

  // ── Facturas ──
  const facturasThisYear = facturas.filter(f => yearOf(f.fecha) === CY && esFacturaReal(f));
  const facturasLastYTD  = facturas.filter(f => yearOf(f.fecha) === PY && new Date(f.fecha + 'T00:00:00').getMonth() <= CM && esFacturaReal(f));
  const facturasLastFull = facturas.filter(f => yearOf(f.fecha) === PY && esFacturaReal(f));

  const facturacionYTD = facturasThisYear.reduce((s, f) => s + recBase(f), 0);
  const facturacionPY  = facturasLastYTD.reduce((s, f) => s + recBase(f), 0);

  // ── Gastos ──
  const gastosThisYear = gastos.filter(g => yearOf(g.fecha) === CY);
  const gastosLastYTD  = gastos.filter(g => yearOf(g.fecha) === PY && new Date(g.fecha + 'T00:00:00').getMonth() <= CM);

  const gastosYTD = gastosThisYear.reduce((s, g) => s + recBase(g), 0);
  const gastosPY  = gastosLastYTD.reduce((s, g) => s + recBase(g), 0);

  // ── KPIs derivados ──
  const resultadoNeto   = facturacionYTD - gastosYTD;
  const resultadoNetoPY = facturacionPY - gastosPY;

  // pendiente de cobro: todas las facturas pendientes (todas las épocas), total con IVA
  const pendienteCobro = facturas
    .filter(f => esFacturaReal(f) && f.estado === 'pendiente')
    .reduce((s, f) => s + recTotal(f), 0);

  // saldo actual de tesorería
  let saldoActual: number | null = null;
  let saldoBaseLabel = '';
  if (saldoBase) {
    const cobrado  = facturas
      .filter(f => esFacturaReal(f) && f.estado === 'cobrada' && f.fecha > saldoBase.fecha)
      .reduce((s, f) => s + recTotal(f), 0);
    const gastado  = gastos
      .filter(g => g.fecha > saldoBase.fecha)
      .reduce((s, g) => s + recTotal(g), 0);
    saldoActual   = saldoBase.importe + cobrado - gastado;
    const [y, m, d] = saldoBase.fecha.split('-');
    saldoBaseLabel = `desde ${d}/${m}/${y}`;
  }

  // ── Proyectos activos ──
  const activeProjects = org.projects.filter(p => {
    const ph = getCurrentPhase(p);
    return ph !== 'En Espera' && ph !== 'Finalizado';
  });

  // ── Datos gráfica mensual ──
  const monthlyThis = Array.from({ length: 12 }, (_, m) =>
    facturasThisYear
      .filter(f => new Date(f.fecha + 'T00:00:00').getMonth() === m)
      .reduce((s, f) => s + recBase(f), 0)
  );
  const monthlyPrev = Array.from({ length: 12 }, (_, m) =>
    facturasLastFull
      .filter(f => new Date(f.fecha + 'T00:00:00').getMonth() === m)
      .reduce((s, f) => s + recBase(f), 0)
  );
  const chartMax = niceMax(Math.max(...monthlyThis, ...monthlyPrev));

  // ── Distribución por tipo de servicio (presupuestos aceptados) ──
  const aceptados = presupuestos.filter(p => p.estado === 'aceptado');
  const serviceGroups = [
    { label: 'Obra nueva',    color: '#c8d48a', items: aceptados.filter(p => p.familia !== 'urbanizacion' && p.familia !== 'otros' && p.plantilla === 'nueva') },
    { label: 'Rehabilitación', color: '#d9a8a8', items: aceptados.filter(p => p.familia !== 'urbanizacion' && p.familia !== 'otros' && p.plantilla === 'reforma') },
    { label: 'Otros usos',    color: '#f0b87a', items: aceptados.filter(p => p.familia === 'otros') },
    { label: 'Urbanización',  color: '#b8c8d8', items: aceptados.filter(p => p.familia === 'urbanizacion') },
  ].map(g => ({
    ...g,
    total: g.items.reduce((s, p) => s + honorariosConAjuste(p), 0),
    count: g.items.length,
  }));
  const maxServiceTotal = Math.max(...serviceGroups.map(g => g.total), 1);

  // ── Próximos vencimientos ──
  const todayIso = now.toISOString().slice(0, 10);
  const vencimientos = facturas
    .filter(f => esFacturaReal(f) && f.estado === 'pendiente' && f.vencimiento)
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))
    .slice(0, 6);

  // ── SVG chart constants ──
  const W = 800, H = 190;
  const PL = 52, PR = 16, PT = 28, PB = 30;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const gW = cW / 12;
  const bW = Math.min(18, gW * 0.36);
  const toY = (v: number) => PT + cH - Math.min(1, v / chartMax) * cH;

  const periodNote = `vs. ene–${MONTHS[CM]} ${PY}`;

  return (
    <div style={{ padding: '18px 20px', maxWidth: 1360, margin: '0 auto' }}>

      {/* ── KPIs ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <KPICard
          label="Facturación YTD"
          value={formatearMoneda(facturacionYTD)}
          badge={delta(facturacionYTD, facturacionPY)}
          note={periodNote}
        />
        <KPICard
          label="Gastos YTD"
          value={formatearMoneda(gastosYTD)}
          badge={delta(gastosYTD, gastosPY)}
          note={periodNote}
          valueColor={gastosYTD > facturacionYTD ? '#c0392b' : undefined}
        />
        <KPICard
          label="Resultado neto"
          value={formatearMoneda(resultadoNeto)}
          badge={delta(resultadoNeto, resultadoNetoPY)}
          note={periodNote}
          valueColor={resultadoNeto < 0 ? '#c0392b' : '#2e7d46'}
        />
        <div style={{ flex: '1 1 150px', minWidth: 130, background: '#fff', border: '1px solid #e0ddd5', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: '#a09e99', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>Proyectos activos</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: '#333', lineHeight: 1, marginBottom: 5 }}>{activeProjects.length}</div>
          <div style={{ fontSize: 10, color: '#a09e99' }}>en curso ahora</div>
        </div>
        <KPICard
          label="Pendiente de cobro"
          value={formatearMoneda(pendienteCobro)}
          note="total con IVA · todas las facturas"
          valueColor={pendienteCobro > 0 ? '#b07a1e' : undefined}
        />
        <KPICard
          label="Saldo actual estimado"
          value={saldoActual !== null ? formatearMoneda(saldoActual) : '—'}
          note={saldoActual !== null ? saldoBaseLabel : 'Define un saldo base en Tesorería'}
          valueColor={saldoActual === null ? '#a09e99' : saldoActual >= 0 ? '#2e7d46' : '#c0392b'}
        />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>

        {/* Facturación mensual */}
        <Card>
          <SectionTitle>Facturación mensual — base imponible</SectionTitle>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
            {/* Gridlines + Y-labels */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
              const gv = pct * chartMax;
              const gy = toY(gv);
              return (
                <g key={pct}>
                  <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="#ece9e2" strokeWidth={0.8} />
                  <text x={PL - 5} y={gy + 3.5} textAnchor="end" fontSize={8} fill="#b0aea9">
                    {gv === 0 ? '0' : gv >= 1000 ? `${Math.round(gv / 1000)}k` : String(gv)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {Array.from({ length: 12 }, (_, m) => {
              const cx = PL + (m + 0.5) * gW;
              const ph = monthlyPrev[m];
              const ch = monthlyThis[m];
              return (
                <g key={m}>
                  {ph > 0 && (
                    <rect
                      x={cx - bW - 1.5} y={toY(ph)} width={bW}
                      height={Math.max(1.5, (ph / chartMax) * cH)}
                      fill="#d5d2ca" rx={1.5}
                    />
                  )}
                  {ch > 0 && (
                    <rect
                      x={cx + 1.5} y={toY(ch)} width={bW}
                      height={Math.max(1.5, (ch / chartMax) * cH)}
                      fill="#3d3d3d" rx={1.5}
                    />
                  )}
                  <text x={cx} y={H - PB + 14} textAnchor="middle" fontSize={7.5} fill="#b0aea9">{MONTHS[m]}</text>
                </g>
              );
            })}

            {/* Legend */}
            <rect x={W - PR - 108} y={PT - 16} width={9} height={9} fill="#d5d2ca" rx={1.5} />
            <text x={W - PR - 96} y={PT - 8} fontSize={8} fill="#6b6a66">{PY}</text>
            <rect x={W - PR - 63} y={PT - 16} width={9} height={9} fill="#3d3d3d" rx={1.5} />
            <text x={W - PR - 51} y={PT - 8} fontSize={8} fill="#6b6a66">{CY}</text>
          </svg>
        </Card>

        {/* Distribución por tipo de servicio */}
        <Card>
          <SectionTitle>Tipo de servicio — presupuestos aceptados</SectionTitle>
          {aceptados.length === 0 ? (
            <div style={{ fontSize: 12, color: '#a09e99', paddingTop: 8 }}>Sin presupuestos aceptados</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {serviceGroups.map(g => (
                <div key={g.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11, marginBottom: 5 }}>
                    <span style={{ color: '#333' }}>{g.label}</span>
                    <span style={{ color: '#6b6a66', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                      {g.count} exp. · {formatearMoneda(g.total)}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#f0ede7', borderRadius: 4 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.max(0, Math.round((g.total / maxServiceTotal) * 100))}%`,
                      background: g.color,
                      borderRadius: 4,
                      minWidth: g.count > 0 ? 5 : 0,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Proyectos + Vencimientos row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* Proyectos activos */}
        <Card>
          <SectionTitle>Proyectos activos</SectionTitle>
          {activeProjects.length === 0 ? (
            <div style={{ fontSize: 12, color: '#a09e99', paddingTop: 4 }}>No hay proyectos activos en este momento</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Código', 'Proyecto', 'Fase actual', 'Progreso', 'Autor'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0 8px 8px',
                      fontSize: 10, color: '#a09e99', textTransform: 'uppercase',
                      letterSpacing: '.05em', fontWeight: 500,
                      borderBottom: '1px solid #e0ddd5',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeProjects.map((p, i) => {
                  const phase   = getCurrentPhase(p);
                  const pct     = getPhaseProgress(p);
                  const author  = org.authors.find(a => a.id === p.authorId);
                  const isLast  = i === activeProjects.length - 1;
                  const tdStyle: React.CSSProperties = {
                    padding: '9px 8px',
                    borderBottom: isLast ? 'none' : '1px solid #f0ede7',
                  };
                  return (
                    <tr key={p.id}>
                      <td style={{ ...tdStyle, fontSize: 11, color: '#6b6a66', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{p.code}</td>
                      <td style={{ ...tdStyle, maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{phase}</td>
                      <td style={{ ...tdStyle, minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ flex: 1, height: 5, background: '#f0ede7', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#c8d48a', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#6b6a66', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {author ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: author.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#333' }}>{author.name}</span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Próximos vencimientos */}
        <Card>
          <SectionTitle>Próximos vencimientos</SectionTitle>
          {vencimientos.length === 0 ? (
            <div style={{ fontSize: 12, color: '#a09e99', paddingTop: 4 }}>Sin facturas pendientes de cobro</div>
          ) : (
            <div>
              {vencimientos.map((f, i) => {
                const overdue = f.vencimiento < todayIso;
                const isLast  = i === vencimientos.length - 1;
                return (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 0',
                    borderBottom: isLast ? 'none' : '1px solid #f0ede7',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.cliente || '—'}
                      </div>
                      <div style={{ fontSize: 10, color: '#a09e99', marginTop: 1 }}>{f.numero}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: '#333' }}>
                        {formatearMoneda(recTotal(f))}
                      </div>
                      <div style={{ fontSize: 10, color: overdue ? '#c0392b' : '#6b6a66', marginTop: 1 }}>
                        {overdue ? '⚠ ' : ''}{fechaCorta(f.vencimiento)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
