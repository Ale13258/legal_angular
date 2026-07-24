import { describe, expect, it } from 'vitest';
import { formatMontoColombiano, formatMontoColombianoCurrency } from './format-monto-colombiano';

describe('formatMontoColombiano', () => {
  it('formatea enteros con separador de miles sin perder dígitos', () => {
    expect(formatMontoColombiano(9565879)).toBe('9.565.879');
    expect(formatMontoColombiano(1000000)).toBe('1.000.000');
    expect(formatMontoColombiano(40)).toBe('40');
  });

  it('conserva decimales sin redondear', () => {
    expect(formatMontoColombiano(9.57)).toBe('9,57');
    expect(formatMontoColombiano(250000.75)).toBe('250.000,75');
  });

  it('formatea moneda COP', () => {
    expect(formatMontoColombianoCurrency(9565879)).toBe('$ 9.565.879');
    expect(formatMontoColombianoCurrency(9.57)).toBe('$ 9,57');
  });
});
