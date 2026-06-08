import { readAllData } from '@/lib/data/storage';
import ContabilidadView from '@/components/modules/contabilidad/ContabilidadView';

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteNIF?: string; facturaId?: string }>;
}) {
  const { clienteNIF, facturaId } = await searchParams;
  const data = await readAllData();
  return (
    <ContabilidadView
      initialFacturas={data.contabilidad.facturas}
      initialGastos={data.contabilidad.gastos}
      initialProveedores={data.contabilidad.proveedores}
      clientes={data.clientes}
      presupuestos={data.presupuestos}
      initialClienteNIF={clienteNIF}
      initialFacturaId={facturaId}
    />
  );
}
