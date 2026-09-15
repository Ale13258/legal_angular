import {
  buildClienteEdadMoraBucketDetalle,
  buildClienteUnidadesPorEdadMoraChartData,
  unidadesEjeYFromEdadMoraChartData,
} from './client-chart-data';
import type { Cuenta } from '../models';
import type { DataService } from '../services/data.service';

function cuenta(partial: Partial<Cuenta> & Pick<Cuenta, 'id' | 'identificador'>): Cuenta {
  return {
    cliente_id: 'c1',
    tipo_cuenta: 'apartamento',
    direccion: 'Calle',
    notas: '',
    monto_a_la_fecha: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    cobro_nombre: 'Deudor',
    cobro_tipo_persona: 'natural',
    cobro_documento: '1',
    cobro_email: 'a@b.com',
    ...partial,
  };
}

describe('buildClienteUnidadesPorEdadMoraChartData', () => {
  const data = {
    getResumenMoraCobroParaCuenta: (p: Cuenta) => ({
      edad_mora_dias: p.edad_mora_dias ?? null,
      fecha_inicio_cobro: null,
      fecha_fin_cobro: null,
      fecha_alta: null,
    }),
    getDeudaActualParaCuenta: (p: Cuenta) => Number(p.monto_a_la_fecha) || 0,
  } as Pick<
    DataService,
    'getResumenMoraCobroParaCuenta' | 'getDeudaActualParaCuenta'
  > as DataService;

  it('cuenta unidades, muestra deuda en etiqueta y aptos en eje Y', () => {
    const cuentas = [
      cuenta({ id: '1', identificador: 'Apto 101', edad_mora_dias: 15, monto_a_la_fecha: 10_000 }),
      cuenta({ id: '2', identificador: 'Apto 102', edad_mora_dias: 15, monto_a_la_fecha: 20_000 }),
      cuenta({ id: '3', identificador: 'Apto 201', edad_mora_dias: 15, monto_a_la_fecha: 5_000 }),
      cuenta({ id: '4', identificador: 'Apto 202', edad_mora_dias: 15, monto_a_la_fecha: 7_000 }),
      cuenta({ id: '5', identificador: 'Apto 301', edad_mora_dias: 15, monto_a_la_fecha: 8_000 }),
    ];
    const chart = buildClienteUnidadesPorEdadMoraChartData(data, cuentas);
    expect(chart.labels?.[1]).toEqual(['1–30 d', '$50.000']);
    expect(chart.datasets[0]!.data).toEqual([0, 5, 0, 0, 0]);
    expect(unidadesEjeYFromEdadMoraChartData(chart)).toEqual([
      'Apto 101',
      'Apto 102',
      'Apto 201',
      'Apto 202',
      'Apto 301',
    ]);
  });

  it('reparte unidades en distintos rangos', () => {
    const cuentas = [
      cuenta({ id: '1', identificador: 'Apto 101', edad_mora_dias: 45, monto_a_la_fecha: 30_000 }),
      cuenta({ id: '2', identificador: 'Apto 102', edad_mora_dias: 45, monto_a_la_fecha: 20_000 }),
      cuenta({ id: '3', identificador: 'Apto 201', edad_mora_dias: 45, monto_a_la_fecha: 10_000 }),
      cuenta({ id: '4', identificador: 'Apto 202', edad_mora_dias: 10, monto_a_la_fecha: 5_000 }),
      cuenta({ id: '5', identificador: 'Apto 301', edad_mora_dias: 120, monto_a_la_fecha: 100_000 }),
    ];
    const chart = buildClienteUnidadesPorEdadMoraChartData(data, cuentas);
    expect(chart.datasets[0]!.data).toEqual([0, 1, 3, 0, 1]);
  });

  it('detalle lista aptos y deuda por rango', () => {
    const cuentas = [
      cuenta({ id: '1', identificador: 'Apto 101', edad_mora_dias: 45, monto_a_la_fecha: 12_000 }),
      cuenta({ id: '2', identificador: 'Apto 102', edad_mora_dias: 45, monto_a_la_fecha: 8_000 }),
    ];
    const detalle = buildClienteEdadMoraBucketDetalle(data, cuentas);
    const rango3160 = detalle.find((b) => b.codigo === 'persuasivo_31_60');
    expect(rango3160?.count).toBe(2);
    expect(rango3160?.deuda).toBe(20_000);
  });
});
