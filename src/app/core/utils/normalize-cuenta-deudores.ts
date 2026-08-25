import type { DeudorCobro, Cuenta, TipoPersona } from '../models';

function asTipoPersona(value: unknown): TipoPersona {
  return value === 'juridica' ? 'juridica' : 'natural';
}

/** Algunos backends envían jsonb como string u un objeto único en vez de array. */
export function coerceDeudores(raw: unknown): DeudorCobro[] {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeDeudor(item as Partial<DeudorCobro> & { email?: string }))
      .filter((d): d is DeudorCobro => d != null);
  }
  if (value && typeof value === 'object') {
    const one = normalizeDeudor(value as Partial<DeudorCobro> & { email?: string });
    return one ? [one] : [];
  }
  return [];
}

/**
 * Tras un GET: no reemplazar una lista local más completa por un espejo de un solo deudor.
 * Cubre APIs que persisten `cobro_*` y sintetizan `deudores: [primero]`.
 */
export function mergeDeudoresPreferringComplete(incoming: unknown, previous?: unknown): DeudorCobro[] {
  const next = coerceDeudores(incoming);
  const prev = coerceDeudores(previous);
  if (next.length === 0) return prev;
  if (prev.length > next.length) return prev;
  return next;
}

/** Tras POST/PATCH: lo que acabamos de enviar es la fuente de verdad de esa mutación. */
export function mergeDeudoresAfterWrite(
  incoming: unknown,
  sent?: unknown,
  previous?: unknown,
): DeudorCobro[] {
  const fromSent = coerceDeudores(sent);
  if (fromSent.length) return fromSent;
  return mergeDeudoresPreferringComplete(incoming, previous);
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
  const telefono = String(raw.telefono ?? '').trim() || null;
  let emails = cleanEmails(raw.emails);
  if (!emails.length && raw.email != null) {
    const single = String(raw.email).trim();
    if (single) emails = [single];
  }
  if (!nombre && !documento && !emails.length && !telefono) return null;
  return {
    nombre,
    tipo_persona,
    documento,
    emails: emails.length ? emails : [],
    telefono,
  };
}

/** Construye la lista de deudores desde `deudores` o, en legacy, desde `cobro_*`. */
export function resolveDeudores(
  p: Pick<Cuenta, 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email'> & {
    deudores?: unknown;
  },
): DeudorCobro[] {
  const list = coerceDeudores(p.deudores);
  if (list.length) return list;

  const legacy = normalizeDeudor({
    nombre: p.cobro_nombre,
    tipo_persona: p.cobro_tipo_persona,
    documento: p.cobro_documento,
    emails: p.cobro_email?.trim() ? [p.cobro_email.trim()] : [],
  });
  return legacy ? [legacy] : [];
}

export function mirrorCobroFromDeudores(deudores: DeudorCobro[]): Pick<
  Cuenta,
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
export function normalizeCuentaDeudores<T extends Cuenta>(cuenta: T): T {
  const deudores = resolveDeudores(cuenta);
  const cobro = mirrorCobroFromDeudores(deudores);
  return {
    ...cuenta,
    deudores,
    ...cobro,
  };
}

/** Emails únicos de todos los deudores (orden: deudor 0…n, emails internos). */
export function collectCuentaEmails(
  p: Pick<
    Cuenta,
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

/** Nombres de deudores unidos para saludo ("A", "A y B", "A, B y C"). */
export function formatNombresDeudores(
  p: Pick<
    Cuenta,
    'deudores' | 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email'
  >,
): string {
  const names = resolveDeudores(p)
    .map((d) => d.nombre.trim())
    .filter(Boolean);
  if (!names.length) {
    return p.cobro_nombre?.trim() ?? '';
  }
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** "Estimado(a)" si hay un deudor; "Estimados(as)" si hay varios. */
export function saludoEstimadoDeudores(
  p: Pick<
    Cuenta,
    'deudores' | 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email'
  >,
): string {
  const count = resolveDeudores(p).filter((d) => d.nombre.trim()).length;
  return count > 1 ? 'Estimados(as)' : 'Estimado(a)';
}
