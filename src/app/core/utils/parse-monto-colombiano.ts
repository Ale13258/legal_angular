/**
 * Interpreta montos escritos en formato colombiano o solo dígitos.
 * Puntos = miles, coma = decimales (ej. 1.234.567,89).
 */
export function parseMontoColombiano(raw: string | number | null | undefined): number {
  if (raw == null) return Number.NaN;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : Number.NaN;
  }

  let s = String(raw).trim().replace(/\s/g, '');
  if (!s) return Number.NaN;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1 && lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : Number.NaN;
  }

  if (lastDot > -1 && lastComma === -1) {
    const dots = (s.match(/\./g) || []).length;
    const afterDot = s.slice(lastDot + 1);
    if (dots > 1 || (dots === 1 && afterDot.length === 3)) {
      const n = Number(s.replace(/\./g, ''));
      return Number.isFinite(n) ? n : Number.NaN;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : Number.NaN;
  }

  if (lastComma > -1 && lastDot === -1) {
    const afterComma = s.slice(lastComma + 1);
    if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
      const n = Number(s.replace(',', '.'));
      return Number.isFinite(n) ? n : Number.NaN;
    }
    const n = Number(s.replace(/,/g, ''));
    return Number.isFinite(n) ? n : Number.NaN;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}
