import type { Cliente, Cuenta } from './models';

const MS_DIA = 86_400_000;

export type MoraPorClienteRow = {
  cliente_id: string;
  nombre: string;
  deuda: number;
  /** Participación en la cartera en mora (0–100). */
  porcentaje_mora: number;
  /** Máxima edad en mora entre las unidades del cliente. */
  edad_mora_dias: number | null;
  /** Días desde el alta del cliente. */
  antiguedad_dias: number;
  created_at: string;
};

export function diasDesde(isoDate: string | null | undefined, now: Date): number {
  const created = Date.parse(String(isoDate ?? '').trim());
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / MS_DIA));
}

export function buildMoraPorCliente(options: {
  clientes: Cliente[];
  cuentas: Cuenta[];
  deudaDe: (cuenta: Cuenta) => number;
  edadMoraDe: (cuenta: Cuenta) => number | null;
  now?: Date;
}): MoraPorClienteRow[] {
  const now = options.now ?? new Date();
  const cuentas = options.cuentas;
  const total = cuentas.reduce((sum, p) => sum + Math.max(0, options.deudaDe(p)), 0);

  const rows = options.clientes.map((c) => {
    const props = cuentas.filter((p) => p.cliente_id === c.id);
    const deuda = props.reduce((sum, p) => sum + Math.max(0, options.deudaDe(p)), 0);
    let edadMora: number | null = null;
    for (const p of props) {
      const d = options.edadMoraDe(p);
      if (d == null || !Number.isFinite(Number(d))) continue;
      const n = Math.max(0, Math.floor(Number(d)));
      edadMora = edadMora == null ? n : Math.max(edadMora, n);
    }
    const porcentaje = total > 0 ? Math.round((deuda / total) * 1000) / 10 : 0;
    return {
      cliente_id: c.id,
      nombre: c.nombre?.trim() || 'Sin nombre',
      deuda,
      porcentaje_mora: porcentaje,
      edad_mora_dias: edadMora,
      antiguedad_dias: diasDesde(c.created_at, now),
      created_at: c.created_at,
    };
  });

  return rows.sort((a, b) => {
    if (b.porcentaje_mora !== a.porcentaje_mora) return b.porcentaje_mora - a.porcentaje_mora;
    if (b.antiguedad_dias !== a.antiguedad_dias) return b.antiguedad_dias - a.antiguedad_dias;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

export function pickClienteMasAntiguo(rows: MoraPorClienteRow[]): MoraPorClienteRow | null {
  if (!rows.length) return null;
  return rows.reduce((oldest, row) =>
    row.antiguedad_dias > oldest.antiguedad_dias ? row : oldest,
  );
}
