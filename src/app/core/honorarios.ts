import type { EtapaProceso, ProcesoLegal, TipoProcesoLegal } from './models';
import { etiquetaEtapaProceso } from './proceso-etapas';
import { coerceEstadoProcesoLegal } from './proceso-estado';
import {
  clasificarEtapaCobranza,
  etiquetaEtapaCobranzaCorta,
  type EtapaCobranzaCodigo,
} from './mora-etapas';

/** % jurídicos por etapa (null = sin sugerencia automática). */
const PCT_JURIDICA_POR_ETAPA: Record<EtapaProceso, number | null> = {
  radicacion: 15,
  inadmision: 15,
  subsanacion: 15,
  mandamiento_de_pago: 15,
  medidas_radicadas: 15,
  notificacion: 15,
  sentencia: 20,
  liquidacion_de_costas: 20,
  ejecucion: 20,
  liquidacion_del_credito: 20,
  remate: 20,
  rechazado: 15,
  terminacion: null,
};

/** Fallback por edad en mora (misma etapa que muestra la columna Edad en mora). */
const PCT_POR_ETAPA_COBRANZA: Record<EtapaCobranzaCodigo, number | null> = {
  sin_dato: null,
  al_dia: null,
  persuasivo_1_30: 10,
  persuasivo_31_60: 10,
  probable_juridico_61_90: 10,
  /** Sin etapa procesal: base jurídica (RADICACIÓN). */
  juridico_mas_90: 15,
};

export type HonorariosFuente = 'sugerido' | 'manual' | 'sin_dato';

export type HonorariosResultado = {
  porcentaje: number | null;
  monto: number | null;
  fuente: HonorariosFuente;
  etiqueta: string;
};

/**
 * Porcentaje de honorarios según tipo de proceso y etapa.
 * Acuerdo / pre-jurídico: 10%. Jurídico: tabla por etapa. terminacion / desconocido: null.
 */
export function porcentajeHonorarios(
  tipo: TipoProcesoLegal | null | undefined,
  etapa: EtapaProceso | null | undefined,
): number | null {
  if (!tipo) return null;
  if (tipo === 'acuerdo_de_pago' || tipo === 'extrajudicial') return 10;
  if (tipo === 'juridica') {
    if (!etapa) return null;
    return PCT_JURIDICA_POR_ETAPA[etapa] ?? null;
  }
  return null;
}

/** % sugerido desde la etapa operativa de mora (columna Edad en mora). */
export function porcentajeHonorariosDesdeMora(
  edadMoraDias: number | null | undefined,
): { porcentaje: number; etiqueta: string } | null {
  const codigo = clasificarEtapaCobranza(edadMoraDias);
  const pct = PCT_POR_ETAPA_COBRANZA[codigo];
  if (pct == null) return null;
  return { porcentaje: pct, etiqueta: `${pct}% · ${etiquetaEtapaCobranzaCorta(codigo)}` };
}

/** Coerce API Decimal/string/number → finite number or null. */
export function coerceHonorariosMonto(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

export function calcularHonorarios(input: {
  deuda: number;
  tipo?: TipoProcesoLegal | null;
  etapa?: EtapaProceso | null;
  overrideMonto?: number | null | string;
  /** Si no hay % por radicado, usa la etapa de cobranza de la edad en mora. */
  edadMoraDias?: number | null;
}): HonorariosResultado {
  const override = coerceHonorariosMonto(input.overrideMonto);
  if (override != null) {
    const fromProceso = porcentajeHonorarios(input.tipo, input.etapa);
    const fromMora =
      fromProceso == null ? porcentajeHonorariosDesdeMora(input.edadMoraDias)?.porcentaje ?? null : null;
    return {
      porcentaje: fromProceso ?? fromMora,
      monto: override,
      fuente: 'manual',
      etiqueta: 'manual',
    };
  }

  const pctProceso = porcentajeHonorarios(input.tipo, input.etapa);
  if (pctProceso != null) {
    const deuda = Number.isFinite(input.deuda) ? Math.max(0, input.deuda) : 0;
    const monto = Math.round(deuda * (pctProceso / 100) * 100) / 100;
    const etapaLabel =
      input.tipo === 'juridica' && input.etapa
        ? etiquetaEtapaProceso(input.etapa)
        : input.tipo === 'extrajudicial'
          ? 'PRE-JURÍDICO'
          : input.tipo === 'acuerdo_de_pago'
            ? 'ACUERDO DE PAGO'
            : '';
    return {
      porcentaje: pctProceso,
      monto,
      fuente: 'sugerido',
      etiqueta: etapaLabel ? `${pctProceso}% · ${etapaLabel}` : `${pctProceso}%`,
    };
  }

  const mora = porcentajeHonorariosDesdeMora(input.edadMoraDias);
  if (mora) {
    const deuda = Number.isFinite(input.deuda) ? Math.max(0, input.deuda) : 0;
    const monto = Math.round(deuda * (mora.porcentaje / 100) * 100) / 100;
    return {
      porcentaje: mora.porcentaje,
      monto,
      fuente: 'sugerido',
      etiqueta: mora.etiqueta,
    };
  }

  return { porcentaje: null, monto: null, fuente: 'sin_dato', etiqueta: '—' };
}

/**
 * Prefiere el proceso vinculado a la cuenta; si no hay vínculo, usa el del cliente
 * (radicados sin cuenta_id o cualquier radicado del mismo listado).
 * Entre varios: en curso primero, luego el más reciente por created_at.
 */
export function resolverProcesoParaCuenta(
  cuentaId: string,
  procesos: readonly ProcesoLegal[],
): ProcesoLegal | null {
  const linked = procesos.filter((p) => p.cuenta_id === cuentaId);
  if (linked.length) {
    return pickProcesoPreferido(linked);
  }

  // Fallback: radicados del cliente no vinculados a otra propiedad, o todos si ninguno encaja.
  const unlinked = procesos.filter((p) => !p.cuenta_id);
  if (unlinked.length) {
    return pickProcesoPreferido(unlinked);
  }

  // Último recurso: algún radicado del cliente (aunque esté ligado a otra unidad).
  if (procesos.length) {
    return pickProcesoPreferido(procesos);
  }

  return null;
}

function pickProcesoPreferido(procesos: readonly ProcesoLegal[]): ProcesoLegal | null {
  if (!procesos.length) return null;
  const enCurso = procesos.filter((p) => coerceEstadoProcesoLegal(p.estado) === 'en_proceso');
  const pool = enCurso.length ? enCurso : procesos;
  return [...pool].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] ?? null;
}
