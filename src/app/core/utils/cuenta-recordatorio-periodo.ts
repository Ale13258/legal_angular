import type { Gestion } from '../models';

/** Periodo mensual de recordatorio (corte operativo día 30). */
export type PeriodoRecordatorio = {
  year: number;
  /** Mes 1–12. */
  month: number;
  /** Clave `YYYY-MM`. */
  key: string;
  /** `true` si el día de referencia es ≥ 30. */
  pastCutoff: boolean;
};

export type ResumenRecordatorios = {
  total: number;
  enviados: number;
  /** Formato `enviados/total` (ej. `3/5` = 3 recordatorios enviados de 5 propiedades). */
  label: string;
  pendiente: boolean;
};

export function getPeriodoRecordatorio(ref: Date = new Date()): PeriodoRecordatorio {
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1;
  const day = ref.getDate();
  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, '0')}`,
    pastCutoff: day >= 30,
  };
}

function isEmailReminderGestion(
  g: Pick<Gestion, 'tipo' | 'origen' | 'email_reminder_id' | 'detalle'>,
): boolean {
  if (g.tipo === 'email_reminder') return true;
  if (g.tipo === 'manual') return false;
  if (g.origen === 'email_reminder') return true;
  return !!(g.detalle?.email_reminder_id ?? g.email_reminder_id);
}

function dateInPeriodo(iso: string | null | undefined, periodo: PeriodoRecordatorio): boolean {
  if (!iso) return false;
  const match = /^(\d{4})-(\d{2})/.exec(String(iso).trim());
  if (!match) return false;
  return Number(match[1]) === periodo.year && Number(match[2]) === periodo.month;
}

/** Hay recordatorio enviado en el periodo si existe gestión `email_reminder` en ese mes. */
export function cuentaTieneRecordatorioEnPeriodo(
  gestiones: readonly Pick<
    Gestion,
    'tipo' | 'origen' | 'email_reminder_id' | 'detalle' | 'fecha' | 'created_at'
  >[],
  periodo: PeriodoRecordatorio,
): boolean {
  return gestiones.some((g) => {
    if (!isEmailReminderGestion(g)) return false;
    return dateInPeriodo(g.fecha, periodo) || dateInPeriodo(g.created_at, periodo);
  });
}

export function resumenRecordatoriosCliente(
  cuentaIds: readonly string[],
  gestionesByCuenta: Record<string, Gestion[]> | ((id: string) => Gestion[]),
  periodo: PeriodoRecordatorio,
): ResumenRecordatorios {
  const total = cuentaIds.length;
  let enviados = 0;
  for (const id of cuentaIds) {
    const gestiones =
      typeof gestionesByCuenta === 'function'
        ? gestionesByCuenta(id)
        : (gestionesByCuenta[id] ?? []);
    if (cuentaTieneRecordatorioEnPeriodo(gestiones, periodo)) {
      enviados += 1;
    }
  }
  return {
    total,
    enviados,
    label: `${enviados}/${total}`,
    pendiente: enviados < total,
  };
}

export function recordatorioBadgeLabel(enviado: boolean): string {
  return enviado ? 'Enviado' : 'Pendiente';
}

export function recordatorioBadgeVariant(enviado: boolean): string {
  return enviado ? 'enviado' : 'contactado';
}
