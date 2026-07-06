export function normalizarNIF(nif: string): string {
  return (nif || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
