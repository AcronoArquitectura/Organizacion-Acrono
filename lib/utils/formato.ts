export function formatearMoneda(valor: number): string {
  const neg = valor < 0;
  const [ints, decs] = Math.abs(valor).toFixed(2).split('.');
  const grouped = ints.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + grouped + ',' + decs + ' €';
}

// formatearMoneda(9563.95)   === "9.563,95 €"
// formatearMoneda(13774.14)  === "13.774,14 €"
// formatearMoneda(-1234.56)  === "-1.234,56 €"
// formatearMoneda(0)         === "0,00 €"
// formatearMoneda(999.99)    === "999,99 €"
