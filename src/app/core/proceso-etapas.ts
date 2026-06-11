/**
 * Etapas del proceso judicial de radicación (cuenta de cartera).
 * Fuente única de verdad para slugs, etiquetas UI y validación en formularios.
 */

export const ETAPAS_PROCESO_ORDENADAS = [
  { value: 'radicacion', label: 'RADICACIÓN' },
  { value: 'inadmision', label: 'INADMISIÓN' },
  { value: 'subsanacion', label: 'SUBSANACIÓN' },
  { value: 'mandamiento_de_pago', label: 'MANDAMIENTO DE PAGO' },
  { value: 'medidas_radicadas', label: 'MEDIDAS RADICADAS' },
  { value: 'notificacion', label: 'NOTIFICACIÓN' },
  { value: 'sentencia', label: 'SENTENCIA' },
  { value: 'liquidacion_de_costas', label: 'LIQUIDACIÓN DE COSTAS' },
  { value: 'ejecucion', label: 'EJECUCIÓN' },
  { value: 'liquidacion_del_credito', label: 'LIQUIDACIÓN DEL CRÉDITO' },
  { value: 'remate', label: 'REMATE' },
  { value: 'rechazado', label: 'RECHAZADO' },
  { value: 'terminacion', label: 'TERMINACIÓN' },
] as const;

export type EtapaProceso = (typeof ETAPAS_PROCESO_ORDENADAS)[number]['value'];

export const ETAPA_PROCESO_DEFAULT: EtapaProceso = 'radicacion';

const ETAPA_VALUES = new Set<string>(ETAPAS_PROCESO_ORDENADAS.map((e) => e.value));

export const ETAPA_PROCESO_LABELS: Record<EtapaProceso, string> = Object.fromEntries(
  ETAPAS_PROCESO_ORDENADAS.map((e) => [e.value, e.label])
) as Record<EtapaProceso, string>;

/** Solo lectura: datos no migrados aún en BD. */
export const LEGACY_ETAPA_LABELS: Record<string, string> = {
  inicial: 'INICIAL',
  conciliacion: 'CONCILIACIÓN',
  demanda: 'DEMANDA',
};

/** Mapeo al editar cuentas con slugs legacy (pre-migración). */
const LEGACY_TO_ETAPA: Record<string, EtapaProceso> = {
  inicial: 'radicacion',
  conciliacion: 'subsanacion',
  demanda: 'mandamiento_de_pago',
};

export function isEtapaProceso(value: string): value is EtapaProceso {
  return ETAPA_VALUES.has(value);
}

export function coerceEtapaProceso(value: unknown): EtapaProceso {
  const s = String(value ?? '').trim();
  if (isEtapaProceso(s)) return s;
  const mapped = LEGACY_TO_ETAPA[s];
  if (mapped) return mapped;
  return ETAPA_PROCESO_DEFAULT;
}

export function etiquetaEtapaProceso(value: string | null | undefined): string {
  const s = String(value ?? '').trim();
  if (!s) return '—';
  if (isEtapaProceso(s)) return ETAPA_PROCESO_LABELS[s];
  const legacy = LEGACY_ETAPA_LABELS[s];
  if (legacy) return legacy;
  return s.replace(/_/g, ' ').toUpperCase();
}
