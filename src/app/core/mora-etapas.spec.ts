import {
  clasificarEtapaCobranza,
  etiquetaCortaParaDiasMora,
  etiquetaParaDiasMora,
} from './mora-etapas';

describe('mora-etapas', () => {
  it('clasificarEtapaCobranza uses inclusive tramos', () => {
    expect(clasificarEtapaCobranza(null)).toBe('sin_dato');
    expect(clasificarEtapaCobranza(undefined)).toBe('sin_dato');
    expect(clasificarEtapaCobranza(Number.NaN)).toBe('sin_dato');
    expect(clasificarEtapaCobranza(0)).toBe('al_dia');
    expect(clasificarEtapaCobranza(1)).toBe('persuasivo_1_30');
    expect(clasificarEtapaCobranza(30)).toBe('persuasivo_1_30');
    expect(clasificarEtapaCobranza(31)).toBe('persuasivo_31_60');
    expect(clasificarEtapaCobranza(60)).toBe('persuasivo_31_60');
    expect(clasificarEtapaCobranza(61)).toBe('probable_juridico_61_90');
    expect(clasificarEtapaCobranza(90)).toBe('probable_juridico_61_90');
    expect(clasificarEtapaCobranza(91)).toBe('juridico_mas_90');
    expect(clasificarEtapaCobranza(1000)).toBe('juridico_mas_90');
  });

  it('etiquetaParaDiasMora returns texto operativo', () => {
    expect(etiquetaParaDiasMora(null)).toContain('Sin dato');
    expect(etiquetaParaDiasMora(15)).toContain('pre-jurídica');
    expect(etiquetaParaDiasMora(75)).toContain('Probabilidad');
    expect(etiquetaParaDiasMora(120)).toContain('Etapa jurídica');
  });

  it('etiquetaCortaParaDiasMora es compacta', () => {
    expect(etiquetaCortaParaDiasMora(0)).toBe('Al día');
    expect(etiquetaCortaParaDiasMora(20)).toContain('Pre-jurídico');
    expect(etiquetaCortaParaDiasMora(null)).toBe('—');
  });
});
