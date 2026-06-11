import { describe, expect, it } from 'vitest';
import { formatMontoLegalColombiano, montoEnLetrasPesos } from './monto-en-letras';

describe('monto-en-letras', () => {
  it('formatea monto legal colombiano', () => {
    expect(formatMontoLegalColombiano(16992473)).toBe('$16.992.473,oo');
    expect(formatMontoLegalColombiano(150000)).toBe('$150.000,oo');
  });

  it('convierte montos a letras en formato legal', () => {
    expect(montoEnLetrasPesos(16992473)).toBe(
      'DIECISEIS MILLONES NOVECIENTOS NOVENTA Y DOS MIL CUATROCIENTOS SETENTA Y TRES PESOS MONEDA CORRIENTE',
    );
    expect(montoEnLetrasPesos(0)).toBe('CERO PESOS MONEDA CORRIENTE');
  });
});
