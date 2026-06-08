'use client';

import { useState, useTransition } from 'react';
import type { Factura, Gasto, Proveedor, Cliente, Presupuesto } from '@/lib/types';
import FacturasTab from './FacturasTab';
import GastosTab from './GastosTab';
import ProveedoresTab from './ProveedoresTab';
import ResultadosTab from './ResultadosTab';
import GraficasTab from './GraficasTab';
import ImportarTab from './ImportarTab';

interface Props {
  initialFacturas: Factura[];
  initialGastos: Gasto[];
  initialProveedores: Proveedor[];
  clientes: Cliente[];
  presupuestos: Presupuesto[];
  initialClienteNIF?: string;
  initialFacturaId?: string;
}

type Tab = 'facturas' | 'gastos' | 'proveedores' | 'resultados' | 'graficas' | 'importar';

const TABS: { id: Tab; label: string }[] = [
  { id: 'facturas',    label: 'Facturas emitidas' },
  { id: 'gastos',      label: 'Gastos' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'resultados',  label: 'Resultados' },
  { id: 'graficas',    label: 'Gráficas anuales' },
  { id: 'importar',    label: 'Importar datos' },
];

export default function ContabilidadView({ initialFacturas, initialGastos, initialProveedores, clientes, presupuestos, initialClienteNIF, initialFacturaId }: Props) {
  const [tab, setTab] = useState<Tab>('facturas');
  const [facturas, setFacturas] = useState<Factura[]>(initialFacturas);
  const [gastos, setGastos] = useState<Gasto[]>(initialGastos);
  const [proveedores, setProveedores] = useState<Proveedor[]>(initialProveedores);
  const [isPending, startTransition] = useTransition();

  const snav: React.CSSProperties = {
    background: '#fff', borderBottom: '1px solid #e0ddd5', display: 'flex', padding: '0 20px',
  };
  const stab = (active: boolean): React.CSSProperties => ({
    height: 38, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 12,
    cursor: 'pointer', borderBottom: `2px solid ${active ? '#333' : 'transparent'}`,
    color: active ? '#333' : '#a09e99', fontWeight: active ? 500 : 400, transition: 'color .15s, border-color .15s',
    userSelect: 'none',
  });

  return (
    <div>
      {/* Subnav */}
      <div style={snav}>
        {TABS.map(t => (
          <div key={t.id} style={stab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '18px 20px', maxWidth: 1320 }}>
        {tab === 'facturas'    && <FacturasTab facturas={facturas} onUpdate={setFacturas} clientes={clientes} presupuestos={presupuestos} initialClienteNIF={initialClienteNIF} initialFacturaId={initialFacturaId} isPending={isPending} startTransition={startTransition} />}
        {tab === 'gastos'      && <GastosTab gastos={gastos} proveedores={proveedores} onUpdateGastos={setGastos} onUpdateProveedores={setProveedores} isPending={isPending} startTransition={startTransition} />}
        {tab === 'proveedores' && <ProveedoresTab proveedores={proveedores} gastos={gastos} onUpdate={setProveedores} isPending={isPending} startTransition={startTransition} />}
        {tab === 'resultados'  && <ResultadosTab facturas={facturas} gastos={gastos} />}
        {tab === 'graficas'    && <GraficasTab facturas={facturas} gastos={gastos} />}
        {tab === 'importar'    && (
          <ImportarTab
            onImport={({ facturas: f, gastos: g, proveedores: p }) => {
              setFacturas(f);
              setGastos(g);
              setProveedores(p);
            }}
          />
        )}
      </div>
    </div>
  );
}
