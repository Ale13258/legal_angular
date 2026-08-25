import { describe, expect, it } from 'vitest';
import type { Cuenta } from '../models';
import {
  collectCuentaEmails,
  coerceDeudores,
  formatNombresDeudores,
  mergeDeudoresAfterWrite,
  mergeDeudoresPreferringComplete,
  mirrorCobroFromDeudores,
  normalizeCuentaDeudores,
  resolveDeudores,
  saludoEstimadoDeudores,
} from './normalize-cuenta-deudores';

const baseCuenta = {
  id: 'p-1',
  cliente_id: 'c-1',
  tipo_cuenta: 'apartamento' as const,
  identificador: 'Apto 1',
  direccion: 'Calle 1',
  notas: '',
  monto_a_la_fecha: 1000,
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('normalize-cuenta-deudores', () => {
  it('sintetiza deudores desde cobro_* legacy', () => {
    const p = {
      ...baseCuenta,
      cobro_nombre: 'Ana Pérez',
      cobro_tipo_persona: 'natural' as const,
      cobro_documento: '123',
      cobro_email: 'ana@test.com',
    };
    const deudores = resolveDeudores(p);
    expect(deudores).toEqual([
      {
        nombre: 'Ana Pérez',
        tipo_persona: 'natural',
        documento: '123',
        emails: ['ana@test.com'],
        telefono: null,
      },
    ]);
  });

  it('prioriza deudores[] y espeja cobro_* desde el primero', () => {
    const normalized = normalizeCuentaDeudores({
      ...baseCuenta,
      cobro_nombre: 'Viejo',
      cobro_tipo_persona: 'juridica',
      cobro_documento: '999',
      cobro_email: 'viejo@test.com',
      deudores: [
        {
          nombre: 'Juan',
          tipo_persona: 'natural',
          documento: '111',
          emails: ['juan@test.com', 'juan2@test.com'],
        },
        {
          nombre: 'María',
          tipo_persona: 'natural',
          documento: '222',
          emails: ['maria@test.com'],
        },
      ],
    } as Cuenta);

    expect(normalized.cobro_nombre).toBe('Juan');
    expect(normalized.cobro_documento).toBe('111');
    expect(normalized.cobro_email).toBe('juan@test.com');
    expect(normalized.deudores).toHaveLength(2);
    expect(normalized.deudores?.[0].emails).toEqual(['juan@test.com', 'juan2@test.com']);
  });

  it('deduplica emails por deudor y al aplanar', () => {
    const emails = collectCuentaEmails({
      cobro_nombre: '',
      cobro_tipo_persona: 'natural',
      cobro_documento: '',
      cobro_email: '',
      deudores: [
        {
          nombre: 'A',
          tipo_persona: 'natural',
          documento: '1',
          emails: ['a@test.com', 'A@test.com', 'b@test.com'],
        },
        {
          nombre: 'B',
          tipo_persona: 'natural',
          documento: '2',
          emails: ['b@test.com', 'c@test.com'],
        },
      ],
    });
    expect(emails).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);
  });

  it('mirrorCobroFromDeudores usa el primer email del deudor 0', () => {
    expect(
      mirrorCobroFromDeudores([
        {
          nombre: 'X',
          tipo_persona: 'juridica',
          documento: '900',
          emails: ['uno@test.com', 'dos@test.com'],
        },
      ])
    ).toEqual({
      cobro_nombre: 'X',
      cobro_tipo_persona: 'juridica',
      cobro_documento: '900',
      cobro_email: 'uno@test.com',
    });
  });

  it('formatNombresDeudores une todos los nombres', () => {
    const cuenta = {
      cobro_nombre: 'Solo legado',
      cobro_tipo_persona: 'natural' as const,
      cobro_documento: '1',
      cobro_email: 'a@test.com',
      deudores: [
        {
          nombre: 'HELENA LUCIA CARVAJAL HURTADO',
          tipo_persona: 'natural' as const,
          documento: '1',
          emails: ['hmvsas1@gmail.com'],
        },
        {
          nombre: 'MIGUEL CARVAJAL MANGONES',
          tipo_persona: 'natural' as const,
          documento: '2',
          emails: ['micarman50@hotmail.com'],
        },
      ],
    };
    expect(formatNombresDeudores(cuenta)).toBe(
      'HELENA LUCIA CARVAJAL HURTADO y MIGUEL CARVAJAL MANGONES',
    );
    expect(saludoEstimadoDeudores(cuenta)).toBe('Estimados(as)');
  });

  it('coerceDeudores acepta JSON string y objeto único', () => {
    const asJson = coerceDeudores(
      JSON.stringify([
        { nombre: 'Ana', tipo_persona: 'natural', documento: '1', emails: ['a@test.com'] },
        { nombre: 'Bea', tipo_persona: 'natural', documento: '2', emails: ['b@test.com'] },
      ]),
    );
    expect(asJson).toHaveLength(2);
    expect(coerceDeudores({ nombre: 'Solo', documento: '9', emails: ['s@test.com'] })).toEqual([
      { nombre: 'Solo', tipo_persona: 'natural', documento: '9', emails: ['s@test.com'], telefono: null },
    ]);
  });

  it('conserva deudor con teléfono y sin correos', () => {
    expect(
      coerceDeudores({
        nombre: 'Luis',
        tipo_persona: 'natural',
        documento: '88',
        emails: [],
        telefono: '3001234567',
      }),
    ).toEqual([
      {
        nombre: 'Luis',
        tipo_persona: 'natural',
        documento: '88',
        emails: [],
        telefono: '3001234567',
      },
    ]);
  });

  it('mergeDeudoresAfterWrite conserva lo enviado aunque el API espeje un solo deudor', () => {
    const sent = [
      { nombre: 'Juan', tipo_persona: 'natural' as const, documento: '111', emails: ['juan@test.com'] },
      { nombre: 'María', tipo_persona: 'natural' as const, documento: '222', emails: ['maria@test.com'] },
    ];
    const fromApi = [sent[0]];
    expect(mergeDeudoresAfterWrite(fromApi, sent)).toHaveLength(2);
    expect(mergeDeudoresAfterWrite(fromApi, sent)[1]?.nombre).toBe('María');
  });

  it('mergeDeudoresPreferringComplete no deja que un GET truncado pise la lista local', () => {
    const prev = [
      { nombre: 'Juan', tipo_persona: 'natural' as const, documento: '111', emails: ['juan@test.com'] },
      { nombre: 'María', tipo_persona: 'natural' as const, documento: '222', emails: ['maria@test.com'] },
    ];
    expect(mergeDeudoresPreferringComplete([prev[0]], prev)).toHaveLength(2);
    expect(mergeDeudoresPreferringComplete(undefined, prev)).toHaveLength(2);
    expect(mergeDeudoresPreferringComplete(prev, [prev[0]])).toHaveLength(2);
  });
});
