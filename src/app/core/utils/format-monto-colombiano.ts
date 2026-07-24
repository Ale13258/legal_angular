/** Convierte un número a texto plano sin notación científica ni redondeo. */
function toPlainNumberParts(value: number): { entero: string; decimales: string } {
  if (!Number.isFinite(value)) return { entero: '0', decimales: '' };

  const negative = value < 0;
  const abs = Math.abs(value);

  if (Math.abs(abs - Math.round(abs)) < 1e-9) {
    const entero = Math.round(abs).toString();
    return { entero: negative ? `-${entero}` : entero, decimales: '' };
  }

  const raw = abs.toString();
  if (raw.includes('e') || raw.includes('E')) {
    const fixed = abs.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
    const [entero, decimales = ''] = fixed.split('.');
    return { entero: negative ? `-${entero}` : entero, decimales };
  }

  const [entero, decimales = ''] = raw.split('.');
  return { entero: negative ? `-${entero}` : entero, decimales };
}

/**
 * Formatea un monto sin redondear ni perder dígitos.
 * Estilo colombiano: miles con punto, decimales con coma (ej. 9.565.879,50).
 */
export function formatMontoColombiano(value: number): string {
  const { entero, decimales } = toPlainNumberParts(value);
  const negative = entero.startsWith('-');
  const digits = negative ? entero.slice(1) : entero;
  const enteroFmt = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const prefix = negative ? '-' : '';

  if (!decimales) return `${prefix}${enteroFmt}`;
  return `${prefix}${enteroFmt},${decimales}`;
}

/** Formato moneda COP sin redondeo (ej. $ 9.565.879). */
export function formatMontoColombianoCurrency(value: number): string {
  const formatted = formatMontoColombiano(value);
  if (formatted.startsWith('-')) return `-$ ${formatted.slice(1)}`;
  return `$ ${formatted}`;
}
