const _fmt = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearMoneda(valor: number): string {
  return _fmt.format(valor) + ' €';
}
