import { getFacturas } from '@/lib/data/facturas';
import { getGastos } from '@/lib/data/gastos';
import { getOrg } from '@/lib/data/organizacion';
import { getPresupuestos } from '@/lib/data/presupuestos';
import { readAllData } from '@/lib/data/storage';
import DashboardView from '@/components/modules/dashboard/DashboardView';

export default async function DashboardPage() {
  const [facturas, gastos, org, presupuestos, allData] = await Promise.all([
    getFacturas(),
    getGastos(),
    getOrg(),
    getPresupuestos(),
    readAllData(),
  ]);

  return (
    <DashboardView
      facturas={facturas}
      gastos={gastos}
      org={org}
      presupuestos={presupuestos}
      saldoBase={allData.contabilidad.saldoBase}
    />
  );
}
