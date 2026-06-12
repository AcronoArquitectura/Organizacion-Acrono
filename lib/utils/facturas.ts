import type { Factura } from '@/lib/types';

// Returns true for invoices that count as real (not proformas).
// Use this wherever facturas are summed, averaged or shown in KPIs.
export const esFacturaReal = (f: Factura): boolean => !f.tipo || f.tipo === 'factura';
