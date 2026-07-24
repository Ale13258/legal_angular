import { describe, expect, it } from 'vitest';
import { parseMontoColombiano } from './parse-monto-colombiano';

describe('parseMontoColombiano', () => {
  it('parsea solo dígitos', () => {
    expect(parseMontoColombiano('9565879')).toBe(9565879);
    expect(parseMontoColombiano(9565879)).toBe(9565879);
  });

  it('parsea formato colombiano con puntos de miles', () => {
    expect(parseMontoColombiano('9.565.879')).toBe(9565879);
    expect(parseMontoColombiano('1.234.567,89')).toBe(1234567.89);
  });

  it('parsea decimales con coma', () => {
    expect(parseMontoColombiano('9,57')).toBe(9.57);
    expect(parseMontoColombiano('250000,75')).toBe(250000.75);
  });

  it('corrige coma usada como separador de miles', () => {
    expect(parseMontoColombiano('9,565879')).toBe(9565879);
  });

  it('parsea decimales con punto cuando no hay grupos de miles', () => {
    expect(parseMontoColombiano('250000.75')).toBe(250000.75);
    expect(parseMontoColombiano('9.56')).toBe(9.56);
  });

  it('devuelve NaN para entradas inválidas', () => {
    expect(parseMontoColombiano('')).toBeNaN();
    expect(parseMontoColombiano(null)).toBeNaN();
    expect(parseMontoColombiano('abc')).toBeNaN();
  });
});
