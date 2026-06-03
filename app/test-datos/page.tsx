import { readAllData } from '@/lib/data/storage';

export default async function TestDatosPage() {
  const data = await readAllData();

  const sections: { title: string; items: unknown[] }[] = [
    { title: 'Proyectos',   items: data.org.projects },
    { title: 'Obras',       items: data.org.obras },
    { title: 'Autores',     items: data.org.authors },
    { title: 'Clientes',    items: data.clientes },
    { title: 'Presupuestos',items: data.presupuestos },
    { title: 'Facturas',    items: data.contabilidad.facturas },
    { title: 'Gastos',      items: data.contabilidad.gastos },
    { title: 'Proveedores', items: data.contabilidad.proveedores },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        Test datos — verificación Fase 2
      </h1>
      <p style={{ fontSize: 12, color: '#a09e99', marginBottom: 24 }}>
        Datos leídos en tiempo real desde Dropbox. Esta página es temporal y se eliminará en Fase 3.
      </p>
      {sections.map(({ title, items }) => (
        <details
          key={title}
          style={{ marginBottom: 10, border: '1px solid #e0ddd5', borderRadius: 6, padding: '8px 14px' }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: '4px 0' }}>
            {title}{' '}
            <span style={{ color: '#a09e99', fontWeight: 400 }}>({items.length} registros)</span>
          </summary>
          <pre style={{ marginTop: 10, fontSize: 11, overflow: 'auto', maxHeight: 320 }}>
            {JSON.stringify(items, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}
