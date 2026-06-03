import { getFacturas } from '@/lib/data/facturas';
import { getGastos } from '@/lib/data/gastos';
import { getProveedores } from '@/lib/data/proveedores';
import ContabilidadView from '@/components/modules/contabilidad/ContabilidadView';

export default async function ContabilidadPage() {
  const [facturas, gastos, proveedores] = await Promise.all([
    getFacturas(),
    getGastos(),
    getProveedores(),
  ]);
  return (
    <ContabilidadView
      initialFacturas={facturas}
      initialGastos={gastos}
      initialProveedores={proveedores}
    />
  );
}
