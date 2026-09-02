import { buildMoraPorCliente, pickClienteMasAntiguo } from './mora-por-cliente';
import type { Cliente, Cuenta } from './models';

const cobro = {
  cobro_nombre: 'Deudor',
  cobro_tipo_persona: 'natural' as const,
  cobro_documento: '1',
  cobro_email: 'a@test.com',
};

function cliente(partial: Pick<Cliente, 'id' | 'nombre' | 'created_at'>): Cliente {
  return {
    tipo_persona: 'natural',
    documento: partial.id,
    telefono: '',
    email: '',
    direccion: '',
    observaciones: '',
    ...partial,
  };
}

function cuenta(partial: Pick<Cuenta, 'id' | 'cliente_id'> & Partial<Cuenta>): Cuenta {
  return {
    tipo_cuenta: 'apartamento',
    identificador: partial.id,
    direccion: '',
    notas: '',
    monto_a_la_fecha: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    ...cobro,
    ...partial,
  };
}

describe('buildMoraPorCliente', () => {
  const now = new Date('2026-08-25T00:00:00.000Z');

  it('reparte el porcentaje de mora y calcula antigüedad desde el alta', () => {
    const rows = buildMoraPorCliente({
      clientes: [
        cliente({ id: 'old', nombre: 'Cliente Viejo', created_at: '2025-08-25T00:00:00.000Z' }),
        cliente({ id: 'new', nombre: 'Cliente Nuevo', created_at: '2026-08-20T00:00:00.000Z' }),
      ],
      cuentas: [
        cuenta({ id: 'u1', cliente_id: 'old', monto_a_la_fecha: 750, edad_mora_dias: 40 }),
        cuenta({ id: 'u2', cliente_id: 'new', monto_a_la_fecha: 250, edad_mora_dias: 10 }),
      ],
      deudaDe: (p) => p.monto_a_la_fecha,
      edadMoraDe: (p) => p.edad_mora_dias ?? null,
      now,
    });

    expect(rows[0].nombre).toBe('Cliente Viejo');
    expect(rows[0].porcentaje_mora).toBe(75);
    expect(rows[0].antiguedad_dias).toBe(365);
    expect(rows[0].edad_mora_dias).toBe(40);
    expect(rows[1].porcentaje_mora).toBe(25);
    expect(rows[1].antiguedad_dias).toBe(5);
    expect(pickClienteMasAntiguo(rows)?.nombre).toBe('Cliente Viejo');
  });

  it('deja porcentajes en 0 si no hay cartera en mora', () => {
    const rows = buildMoraPorCliente({
      clientes: [cliente({ id: 'c1', nombre: 'Solo', created_at: '2026-08-01T00:00:00.000Z' })],
      cuentas: [cuenta({ id: 'u1', cliente_id: 'c1', monto_a_la_fecha: 0 })],
      deudaDe: () => 0,
      edadMoraDe: () => 0,
      now,
    });
    expect(rows[0].porcentaje_mora).toBe(0);
  });
});
