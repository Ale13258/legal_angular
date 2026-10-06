import { sumarDiasHabiles } from './utils/dias-habiles-co';

export type EtapaTutela =
  | 'radicacion'
  | 'admision'
  | 'inadmision'
  | 'requerimiento'
  | 'sentencia'
  | 'impugnacion'
  | 'desacato'
  | 'admite_impugnacion'
  | 'otro'
  | 'finalizada';

export type EtapaTutelaRegla = {
  value: EtapaTutela;
  label: string;
  /** Días hábiles de término; `null` = sin término automático. */
  dias: number | null;
  /** Fecha base del término. */
  desde: 'etapa' | 'radicacion' | null;
};

/** Debe coincidir con `back-legal/src/modules/tutelas/domain/etapa-tutela.ts`. */
export const ETAPAS_TUTELA: ReadonlyArray<EtapaTutelaRegla> = [
  { value: 'radicacion', label: 'RADICACIÓN', dias: 3, desde: 'etapa' },
  { value: 'admision', label: 'ADMISIÓN', dias: 3, desde: 'etapa' },
  { value: 'inadmision', label: 'INADMISIÓN', dias: 2, desde: 'etapa' },
  { value: 'requerimiento', label: 'REQUERIMIENTO', dias: 3, desde: 'etapa' },
  { value: 'sentencia', label: 'SENTENCIA', dias: 10, desde: 'radicacion' },
  { value: 'impugnacion', label: 'IMPUGNACIÓN', dias: 3, desde: 'etapa' },
  { value: 'desacato', label: 'DESACATO', dias: 3, desde: 'etapa' },
  { value: 'admite_impugnacion', label: 'ADMITE IMPUG', dias: 10, desde: 'etapa' },
  { value: 'otro', label: 'OTRO', dias: null, desde: null },
  { value: 'finalizada', label: 'FINALIZADA', dias: null, desde: null },
];

export const ETAPAS_TUTELA_SIN_ALERTA: ReadonlyArray<EtapaTutela> = ['finalizada'];

export const DERECHOS_TUTELA_SUGERIDOS = [
  'PETICION',
  'SALUD',
  'DEBIDO PROCESO',
  'MINIMO VITAL',
  'HABEAS DATA',
  'VIVIENDA DIGNA',
  'IGUALDAD',
] as const;

export function reglaEtapaTutela(etapa: string | null | undefined): EtapaTutelaRegla | undefined {
  return ETAPAS_TUTELA.find((e) => e.value === etapa);
}

export function labelEtapaTutela(etapa: string | null | undefined): string {
  return reglaEtapaTutela(etapa)?.label ?? String(etapa ?? '—').toUpperCase();
}

export function coerceEtapaTutela(value: unknown): EtapaTutela {
  return reglaEtapaTutela(String(value ?? '').trim())?.value ?? 'radicacion';
}

/** `''` cuando la etapa no tiene término automático o falta la fecha base. */
export function calcularVencimientoEtapa(input: {
  etapa: EtapaTutela;
  fecha_etapa: string;
  fecha_radicacion: string;
}): string {
  const regla = reglaEtapaTutela(input.etapa);
  if (!regla || regla.dias === null) return '';
  const base = regla.desde === 'radicacion' ? input.fecha_radicacion : input.fecha_etapa;
  return base ? sumarDiasHabiles(base, regla.dias) : '';
}

export function descripcionTerminoEtapa(etapa: EtapaTutela): string {
  const regla = reglaEtapaTutela(etapa);
  if (!regla) return '';
  if (etapa === 'finalizada') return 'Finalizada: no se envían más alertas.';
  if (regla.dias === null) return 'Término variable: escribe el vencimiento.';
  const dias = `${regla.dias} días hábiles`;
  return regla.desde === 'radicacion' ? `${dias} desde la radicación.` : `${dias} desde el inicio de la etapa.`;
}
