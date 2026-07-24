import type { DeudorCobro, Propiedad, TipoPersona } from '../models';

function asTipoPersona(value: unknown): TipoPersona {
  return value === 'juridica' ? 'juridica' : 'natural';
}

function cleanEmails(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return cleanEmails(raw.split(/[,;]+/));
  }
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const email = String(item ?? '').trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

function normalizeDeudor(raw: Partial<DeudorCobro> & { email?: string }): DeudorCobro | null {
  const nombre = String(raw.nombre ?? '').trim();
  const documento = String(raw.documento ?? '').trim();
  const tipo_persona = asTipoPersona(raw.tipo_persona);
  let emails = cleanEmails(raw.emails);
  if (!emails.length && raw.email != null) {
    const single = String(raw.email).trim();
    if (single) emails = [single];
  }
  if (!nombre && !documento && !emails.length) return null;
  return {
    nombre,
    tipo_persona,
    documento,
    emails: emails.length ? emails : [],
  };
}

/** Construye la lista de deudores desde `deudores` o, en legacy, desde `cobro_*`. */
export function resolveDeudores(
  p: Pick<
    Propiedad,
    'deudores' | 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email'
  >,
): DeudorCobro[] {
  if (Array.isArray(p.deudores) && p.deudores.length > 0) {
    const list = p.deudores
      .map((d) => normalizeDeudor(d))
      .filter((d): d is DeudorCobro => d != null);
    if (list.length) return list;
  }

  const legacy = normalizeDeudor({
    nombre: p.cobro_nombre,
    tipo_persona: p.cobro_tipo_persona,
    documento: p.cobro_documento,
    emails: p.cobro_email?.trim() ? [p.cobro_email.trim()] : [],
  });
  return legacy ? [legacy] : [];
}

export function mirrorCobroFromDeudores(deudores: DeudorCobro[]): Pick<
  Propiedad,
  'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email'
> {
  const first = deudores[0];
  if (!first) {
    return {
      cobro_nombre: '',
      cobro_tipo_persona: 'natural',
      cobro_documento: '',
      cobro_email: '',
    };
  }
  return {
    cobro_nombre: first.nombre,
    cobro_tipo_persona: first.tipo_persona,
    cobro_documento: first.documento,
    cobro_email: first.emails[0] ?? '',
  };
}

/** Normaliza `deudores` y sincroniza el espejo `cobro_*` del deudor principal. */
export function normalizePropiedadDeudores<T extends Propiedad>(propiedad: T): T {
  const deudores = resolveDeudores(propiedad);
  const cobro = mirrorCobroFromDeudores(deudores);
  return {
    ...propiedad,
    deudores,
    ...cobro,
  };
}

/** Emails únicos de todos los deudores (orden: deudor 0…n, emails internos). */
export function collectPropiedadEmails(
  p: Pick<
    Propiedad,
    'deudores' | 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email'
  >,
): string[] {
  const deudores = resolveDeudores(p);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of deudores) {
    for (const email of d.emails) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(email);
    }
  }
  if (!out.length && p.cobro_email?.trim()) {
    out.push(p.cobro_email.trim());
  }
  return out;
}
