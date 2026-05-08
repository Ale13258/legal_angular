/**
 * Clasificación operativa de cobranza según días de mora (edad en mora agregada por unidad).
 * No sustituye la etapa legal/procesal (`EtapaProceso` en cuentas).
 */
export type EtapaCobranzaCodigo =
  | 'sin_dato'
  | 'al_dia'
  | 'persuasivo_1_30'
  | 'persuasivo_31_60'
  | 'probable_juridico_61_90'
  | 'juridico_mas_90';

const ETIQUETAS: Record<EtapaCobranzaCodigo, string> = {
  sin_dato: 'Sin dato de mora',
  al_dia: 'Al día (0 días de mora)',
  persuasivo_1_30:
    'Cobros persuasivos, etapa pre-jurídica (1–30 días): llamadas, mensajes, correos de cobro',
  persuasivo_31_60:
    'Cobros persuasivos, etapa pre-jurídica (31–60 días): llamadas, mensajes, correos de cobro',
  probable_juridico_61_90:
    'Probabilidad de inicio de cobro jurídico (61–90 días): notificación formal por correo',
  juridico_mas_90:
    'Etapa jurídica (más de 90 días): presentación de demanda; gestiones de cobro habituales',
};

const ETIQUETAS_CORTAS: Record<EtapaCobranzaCodigo, string> = {
  sin_dato: '—',
  al_dia: 'Al día',
  persuasivo_1_30: 'Pre-jurídico (1–30 d)',
  persuasivo_31_60: 'Pre-jurídico (31–60 d)',
  probable_juridico_61_90: 'Alerta jurídica (61–90 d)',
  juridico_mas_90: 'Jurídico (>90 d)',
};

/**
 * @param dias Edad en mora en días (típicamente `Propiedad.edad_mora_dias` o equivalente).
 */
export function clasificarEtapaCobranza(dias: number | null | undefined): EtapaCobranzaCodigo {
  if (dias == null || !Number.isFinite(Number(dias))) return 'sin_dato';
  const n = Math.max(0, Math.floor(Number(dias)));
  if (n === 0) return 'al_dia';
  if (n <= 30) return 'persuasivo_1_30';
  if (n <= 60) return 'persuasivo_31_60';
  if (n <= 90) return 'probable_juridico_61_90';
  return 'juridico_mas_90';
}

export function etiquetaEtapaCobranza(codigo: EtapaCobranzaCodigo): string {
  return ETIQUETAS[codigo];
}

export function etiquetaEtapaCobranzaCorta(codigo: EtapaCobranzaCodigo): string {
  return ETIQUETAS_CORTAS[codigo];
}

export function etiquetaParaDiasMora(dias: number | null | undefined): string {
  return etiquetaEtapaCobranza(clasificarEtapaCobranza(dias));
}

export function etiquetaCortaParaDiasMora(dias: number | null | undefined): string {
  return etiquetaEtapaCobranzaCorta(clasificarEtapaCobranza(dias));
}
