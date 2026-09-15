import type { Gestion } from '../models';
import {
  cuentaTieneRecordatorioEnPeriodo,
  getPeriodoRecordatorio,
  recordatorioBadgeLabel,
  recordatorioBadgeVariant,
  resumenRecordatoriosCliente,
} from './cuenta-recordatorio-periodo';

function gestion(partial: Partial<Gestion> & Pick<Gestion, 'id' | 'cuenta_id'>): Gestion {
  return {
    fecha: '2026-09-15',
    created_at: '2026-09-15T12:00:00.000Z',
    estado: 'enviado',
    descripcion: '',
    tipo: 'manual',
    ...partial,
  };
}

describe('cuenta-recordatorio-periodo', () => {
  const periodoSep = getPeriodoRecordatorio(new Date(2026, 8, 10)); // Sep 2026

  it('arma periodo YYYY-MM y pastCutoff según día 30', () => {
    expect(getPeriodoRecordatorio(new Date(2026, 8, 10))).toEqual({
      year: 2026,
      month: 9,
      key: '2026-09',
      pastCutoff: false,
    });
    expect(getPeriodoRecordatorio(new Date(2026, 8, 30)).pastCutoff).toBe(true);
    // Octubre tiene 31 días; Sep 31 no es una fecha válida en JS (rueda a Oct 1).
    expect(getPeriodoRecordatorio(new Date(2026, 9, 31)).pastCutoff).toBe(true);
  });

  it('cuenta recordatorio solo con email_reminder del mes', () => {
    expect(cuentaTieneRecordatorioEnPeriodo([], periodoSep)).toBe(false);

    expect(
      cuentaTieneRecordatorioEnPeriodo(
        [
          gestion({
            id: '1',
            cuenta_id: 'c1',
            tipo: 'manual',
            fecha: '2026-09-12',
          }),
        ],
        periodoSep,
      ),
    ).toBe(false);

    expect(
      cuentaTieneRecordatorioEnPeriodo(
        [
          gestion({
            id: '2',
            cuenta_id: 'c1',
            tipo: 'email_reminder',
            fecha: '2026-08-20',
            created_at: '2026-08-20T10:00:00.000Z',
          }),
        ],
        periodoSep,
      ),
    ).toBe(false);

    expect(
      cuentaTieneRecordatorioEnPeriodo(
        [
          gestion({
            id: '3',
            cuenta_id: 'c1',
            tipo: 'email_reminder',
            fecha: '2026-09-05',
          }),
        ],
        periodoSep,
      ),
    ).toBe(true);
  });

  it('acepta legacy origen/email_reminder_id', () => {
    expect(
      cuentaTieneRecordatorioEnPeriodo(
        [
          gestion({
            id: '4',
            cuenta_id: 'c1',
            tipo: undefined,
            origen: 'email_reminder',
            fecha: '2026-09-01',
          }),
        ],
        periodoSep,
      ),
    ).toBe(true);

    expect(
      cuentaTieneRecordatorioEnPeriodo(
        [
          gestion({
            id: '5',
            cuenta_id: 'c1',
            tipo: undefined,
            email_reminder_id: 'rem-1',
            fecha: '2026-09-01',
          }),
        ],
        periodoSep,
      ),
    ).toBe(true);
  });

  it('resume enviados/total en formato 3/5', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const byCuenta: Record<string, Gestion[]> = {
      a: [
        gestion({
          id: 'g1',
          cuenta_id: 'a',
          tipo: 'email_reminder',
          fecha: '2026-09-02',
        }),
      ],
      b: [
        gestion({
          id: 'g2',
          cuenta_id: 'b',
          tipo: 'email_reminder',
          fecha: '2026-09-03',
        }),
      ],
      c: [gestion({ id: 'g3', cuenta_id: 'c', tipo: 'manual', fecha: '2026-09-04' })],
      d: [],
      e: [],
    };

    expect(resumenRecordatoriosCliente(ids, byCuenta, periodoSep)).toEqual({
      total: 5,
      enviados: 2,
      label: '2/5',
      pendiente: true,
    });

    expect(resumenRecordatoriosCliente(ids, () => [], periodoSep)).toEqual({
      total: 5,
      enviados: 0,
      label: '0/5',
      pendiente: true,
    });

    expect(resumenRecordatoriosCliente([], byCuenta, periodoSep)).toEqual({
      total: 0,
      enviados: 0,
      label: '0/0',
      pendiente: false,
    });
  });
  it('elige label y variante de badge', () => {
    expect(recordatorioBadgeLabel(true)).toBe('Enviado');
    expect(recordatorioBadgeLabel(false)).toBe('Pendiente');
    expect(recordatorioBadgeVariant(true)).toBe('enviado');
    expect(recordatorioBadgeVariant(false)).toBe('contactado');
  });
});
