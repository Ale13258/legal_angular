import type { Cliente, ClientePortalStatus } from '../models';

export function normalizeClientePortalStatus(
  value: string | null | undefined,
): ClientePortalStatus | null {
  switch (value) {
    case 'none':
    case 'pending':
    case 'active':
    case 'expired':
    case 'inactive':
      return value;
    default:
      return null;
  }
}

/**
 * Etiqueta operativa: Registrado vs Sin registro.
 * `null` si el API aún no envía el campo (no inventar estado).
 */
export function clientePortalLabel(status: ClientePortalStatus | null | undefined): string | null {
  const normalized = normalizeClientePortalStatus(status);
  if (normalized == null) return null;
  return normalized === 'active' ? 'Registrado' : 'Sin registro';
}

export function clientePortalBadgeVariant(
  status: ClientePortalStatus | null | undefined,
): string {
  return normalizeClientePortalStatus(status) === 'active'
    ? 'portal_registrado'
    : 'portal_sin_registro';
}

/** Reenviar bienvenida solo si aún no activó el portal y hay correo en ficha. */
export function canResendClientePortalInvitation(
  cliente: Pick<Cliente, 'email' | 'portal_status'> | null | undefined,
): boolean {
  if (!cliente) return false;
  const email = cliente.email?.trim();
  if (!email) return false;
  const status = normalizeClientePortalStatus(cliente.portal_status);
  return status === 'pending' || status === 'expired';
}

export type ClientePortalFilter = 'todos' | 'registrado' | 'sin_registro';

export function matchesClientePortalFilter(
  status: ClientePortalStatus | null | undefined,
  filter: ClientePortalFilter,
): boolean {
  if (filter === 'todos') return true;
  const normalized = normalizeClientePortalStatus(status);
  if (normalized == null) return false;
  if (filter === 'registrado') return normalized === 'active';
  return normalized !== 'active';
}
