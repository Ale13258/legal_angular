import {
  canResendClientePortalInvitation,
  clientePortalBadgeVariant,
  clientePortalLabel,
  matchesClientePortalFilter,
  normalizeClientePortalStatus,
} from './cliente-portal-status';

describe('cliente-portal-status', () => {
  it('normaliza status conocidos y rechaza desconocidos', () => {
    expect(normalizeClientePortalStatus('active')).toBe('active');
    expect(normalizeClientePortalStatus('pending')).toBe('pending');
    expect(normalizeClientePortalStatus('foo')).toBeNull();
    expect(normalizeClientePortalStatus(undefined)).toBeNull();
  });

  it('etiqueta Registrado solo cuando active; null si desconocido', () => {
    expect(clientePortalLabel('active')).toBe('Registrado');
    expect(clientePortalLabel('pending')).toBe('Sin registro');
    expect(clientePortalLabel('expired')).toBe('Sin registro');
    expect(clientePortalLabel(null)).toBeNull();
    expect(clientePortalLabel(undefined)).toBeNull();
  });

  it('permite reenviar en pending/expired con email', () => {
    expect(
      canResendClientePortalInvitation({ email: 'a@b.com', portal_status: 'pending' }),
    ).toBe(true);
    expect(
      canResendClientePortalInvitation({ email: 'a@b.com', portal_status: 'expired' }),
    ).toBe(true);
    expect(canResendClientePortalInvitation({ email: 'a@b.com', portal_status: 'none' })).toBe(
      false,
    );
    expect(
      canResendClientePortalInvitation({ email: 'a@b.com', portal_status: 'active' }),
    ).toBe(false);
    expect(canResendClientePortalInvitation({ email: '  ', portal_status: 'pending' })).toBe(
      false,
    );
  });

  it('elige variante de badge', () => {
    expect(clientePortalBadgeVariant('active')).toBe('portal_registrado');
    expect(clientePortalBadgeVariant('pending')).toBe('portal_sin_registro');
  });

  it('filtra registrados vs sin registro', () => {
    expect(matchesClientePortalFilter('active', 'todos')).toBe(true);
    expect(matchesClientePortalFilter('pending', 'todos')).toBe(true);
    expect(matchesClientePortalFilter('active', 'registrado')).toBe(true);
    expect(matchesClientePortalFilter('pending', 'registrado')).toBe(false);
    expect(matchesClientePortalFilter('pending', 'sin_registro')).toBe(true);
    expect(matchesClientePortalFilter('active', 'sin_registro')).toBe(false);
    expect(matchesClientePortalFilter(null, 'registrado')).toBe(false);
  });
});
