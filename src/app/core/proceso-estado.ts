import type { EstadoProcesoLegal } from './models';

/** Los únicos estados que el usuario elige: EN PROCESO y FINALIZADO. */
export const ESTADOS_PROCESO_LEGAL_UI: Array<{ value: EstadoProcesoLegal; label: string }> = [
  { value: 'en_proceso', label: 'EN PROCESO' },
  { value: 'cerrada', label: 'FINALIZADO' },
];

/** `activa` legacy se muestra y se edita como EN PROCESO. */
export function coerceEstadoProcesoLegal(value: unknown): EstadoProcesoLegal {
  return String(value ?? '').trim() === 'cerrada' ? 'cerrada' : 'en_proceso';
}

export function labelEstadoProcesoLegal(estado: string | null | undefined): string {
  return coerceEstadoProcesoLegal(estado) === 'cerrada' ? 'FINALIZADO' : 'EN PROCESO';
}

export function variantEstadoProcesoLegal(estado: string | null | undefined): string {
  return coerceEstadoProcesoLegal(estado);
}

export function matchesEstadoProcesoLegalFilter(
  estado: string | null | undefined,
  filter: string,
): boolean {
  if (filter === 'todos') return true;
  if (estado == null || estado === '') return false;
  return coerceEstadoProcesoLegal(estado) === filter;
}
