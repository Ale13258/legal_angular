import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { Cliente, Cuenta, Gestion, HistorialPago, Propiedad } from '../models';
import { DataService } from './data.service';

function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.endsWith('/') ? environment.apiBaseUrl.slice(0, -1) : environment.apiBaseUrl;
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}${segment}`;
}

function clearLocalStorage(): void {
  const storage = globalThis.localStorage;
  if (storage && typeof storage.clear === 'function') storage.clear();
}

const sampleCobroPropiedad = {
  cobro_nombre: 'Contacto Cobro',
  cobro_tipo_persona: 'natural' as const,
  cobro_documento: '123456789',
  cobro_email: 'cobro@test.com',
};

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    clearLocalStorage();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock?.verify();
    clearLocalStorage();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should format currency in COP', () => {
    expect(service.formatCurrency(1000000)).toContain('1');
    expect(service.formatCurrency(1000000)).toMatch(/[\d.,]+/);
  });

  it('should format invalid currency values as 0 COP', () => {
    const text = service.formatCurrency(Number.NaN as unknown as number);
    expect(text).not.toContain('NaN');
    expect(text).toContain('0');
  });

  it('should clamp debt format to zero when negative', () => {
    const text = service.formatDeuda(-1000);
    expect(text).toContain('0');
    expect(text).not.toContain('-');
  });

  it('should format dias mora and empty as em dash', () => {
    expect(service.formatDiasMora(30)).toContain('30');
    expect(service.formatDiasMora(null)).toBe('—');
  });

  it('formatEtapaCobranza uses mora-etapas labels', () => {
    expect(service.formatEtapaCobranza(15)).toContain('pre-jurídica');
    expect(service.formatEtapaCobranzaCorta(45)).toContain('31');
    expect(service.formatEtapaCobranzaCorta(45)).toContain('60');
    expect(service.formatEtapaCobranzaCorta(null)).toBe('—');
  });

  it('should format fecha corta or em dash for invalid', () => {
    expect(service.formatFechaCorta('')).toBe('—');
    expect(service.formatFechaCorta('2026-03-15')).not.toBe('—');
  });

  it('findClienteDuplicado detecta documento con formato distinto', () => {
    service['clientesSignal'].set([
      {
        id: 'c-1',
        nombre: 'Existente',
        tipo_persona: 'juridica',
        documento: '900.123.456-7',
        telefono: '',
        email: 'otro@test.com',
        direccion: '',
        observaciones: '',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    expect(service.findClienteDuplicado({ documento: '9001234567' })?.id).toBe('c-1');
    expect(service.normalizeDocumentoKey('1.023.456.789')).toBe('1023456789');
  });

  it('findClienteDuplicado detecta email case-insensitive y no compara emails vacíos', () => {
    service['clientesSignal'].set([
      {
        id: 'c-1',
        nombre: 'Existente',
        tipo_persona: 'natural',
        documento: '999',
        telefono: '',
        email: 'Cliente@Test.com',
        direccion: '',
        observaciones: '',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'c-2',
        nombre: 'Sin correo',
        tipo_persona: 'natural',
        documento: '888',
        telefono: '',
        email: '',
        direccion: '',
        observaciones: '',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);

    expect(service.findClienteDuplicado({ documento: '111', email: 'cliente@test.com' })?.id).toBe('c-1');
    expect(service.findClienteDuplicado({ documento: '777', email: '' })).toBeUndefined();
    expect(service.findClienteDuplicado({ documento: '777', email: '   ' })).toBeUndefined();
  });

  it('formatFechaHora formatea ISO sin mostrar sufijo técnico', () => {
    const formatted = service.formatFechaHora('2026-06-05T19:30:00.000Z');

    expect(formatted).not.toContain('.000Z');
    expect(formatted).not.toContain('T');
    expect(formatted).not.toBe('—');
  });

  it('formatFechaHora con fecha date-only usa hora de fallback', () => {
    const formatted = service.formatFechaHora('2026-06-05', '2026-06-05T14:45:00.000Z');

    expect(formatted).not.toBe('—');
    expect(formatted).toMatch(/\d/);
  });

  it('formatFechaPago usa fecha_pago y created_at del historial', () => {
    const formatted = service.formatFechaPago({
      fecha_pago: '2026-01-10',
      created_at: '2026-01-10T15:20:00.000Z',
    });

    expect(formatted).not.toBe('—');
    expect(formatted).not.toContain('T');
  });

  it('formatGestionFecha formatea ISO sin mostrar sufijo técnico', () => {
    const formatted = service.formatGestionFecha({
      id: 'g-1',
      propiedad_id: 'p-1',
      fecha: '2026-06-05T19:30:00.000Z',
      estado: 'pendiente',
      descripcion: 'Llamada',
      created_at: '2026-06-05T19:30:00.000Z',
    });

    expect(formatted).not.toContain('.000Z');
    expect(formatted).not.toContain('T');
    expect(formatted).not.toBe('—');
  });

  it('formatGestionFecha con fecha date-only usa hora de created_at', () => {
    const formatted = service.formatGestionFecha({
      id: 'g-1',
      propiedad_id: 'p-1',
      fecha: '2026-06-05',
      estado: 'pendiente',
      descripcion: 'Llamada',
      created_at: '2026-06-05T14:45:00.000Z',
    });

    expect(formatted).not.toBe('—');
    expect(formatted).toMatch(/\d/);
  });

  it('calcula la deuda del historial con la misma base de la card', async () => {
    const propiedad: Propiedad = {
      id: 'prop-1',
      cliente_id: 'cliente-1',
      tipo_propiedad: 'apartamento',
      identificador: 'Apto 101',
      direccion: 'Calle 1',
      notas: '',
      ...sampleCobroPropiedad,
      saldo_inicial: 1000,
      monto_a_la_fecha: 9999,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const enero: HistorialPago = {
      id: 'hist-enero',
      propiedad_id: propiedad.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 0,
      valor_pagado: 200,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 9999,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };
    const febrero: HistorialPago = {
      ...enero,
      id: 'hist-febrero',
      periodo: '2026-02',
      valor_pagado: 300,
      fecha_pago: '2026-02-10',
      created_at: '2026-02-10T00:00:00.000Z',
    };

    const loadP = service.loadHistorialByPropiedad(propiedad.id);
    const reqLoad = httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}/historial`));
    reqLoad.flush([febrero, enero]);
    await loadP;

    expect(service.getDeudaParaHistorialPago(propiedad, enero)).toBe(800);
    expect(service.getDeudaParaHistorialPago(propiedad, febrero)).toBe(500);
    expect(service.getDeudaActualParaPropiedad(propiedad)).toBe(500);
  });

  it('should get total cartera', () => {
    const total = service.getTotalCartera();
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it('calcula cartera total como suma de deuda a la fecha por propiedad', async () => {
    const propA: Propiedad = {
      id: 'prop-a',
      cliente_id: 'cliente-1',
      tipo_propiedad: 'apartamento',
      identificador: 'Apto A',
      direccion: 'Calle A',
      notas: '',
      ...sampleCobroPropiedad,
      saldo_inicial: 1000,
      monto_a_la_fecha: 1000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const propB: Propiedad = {
      ...propA,
      id: 'prop-b',
      identificador: 'Apto B',
      saldo_inicial: 2000,
      monto_a_la_fecha: 2000,
    };
    const histA: HistorialPago = {
      id: 'hist-a',
      propiedad_id: propA.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 0,
      valor_pagado: 250,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 9999,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };
    const histB: HistorialPago = {
      ...histA,
      id: 'hist-b',
      propiedad_id: propB.id,
      valor_pagado: 750,
    };

    const loadPropsP = service.loadPropiedades();
    const reqProps = httpMock.expectOne(apiUrl('/propiedades'));
    reqProps.flush([propA, propB]);
    await loadPropsP;

    const loadHistP = service.loadHistorialesForPropiedades([propA, propB]);
    httpMock.expectOne(apiUrl(`/propiedades/${propA.id}/historial`)).flush([histA]);
    httpMock.expectOne(apiUrl(`/propiedades/${propB.id}/historial`)).flush([histB]);
    await loadHistP;

    expect(service.getTotalCartera()).toBe(2000);
  });

  it('conserva el saldo inicial al recargar propiedades sin saldo_inicial', async () => {
    const propiedad: Propiedad = {
      id: 'prop-preserve',
      cliente_id: 'cliente-1',
      tipo_propiedad: 'apartamento',
      identificador: 'Apto Preserve',
      direccion: 'Calle Preserve',
      notas: '',
      ...sampleCobroPropiedad,
      saldo_inicial: 100000,
      monto_a_la_fecha: 100000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const propiedadRecargadaSinInicial: Propiedad = {
      id: propiedad.id,
      cliente_id: propiedad.cliente_id,
      tipo_propiedad: propiedad.tipo_propiedad,
      identificador: propiedad.identificador,
      direccion: propiedad.direccion,
      notas: propiedad.notas,
      ...sampleCobroPropiedad,
      monto_a_la_fecha: 130000,
      created_at: propiedad.created_at,
    };
    const pago: HistorialPago = {
      id: 'hist-preserve',
      propiedad_id: propiedad.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 90000,
      valor_pagado: 30000,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 130000,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };

    const loadPropiedadP = service.loadPropiedad(propiedad.id);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}`)).flush(propiedad);
    await loadPropiedadP;

    const loadHistorialP = service.loadHistorialByPropiedad(propiedad.id);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}/historial`)).flush([pago]);
    await loadHistorialP;

    const loadClientePropsP = service.loadPropiedadesByCliente(propiedad.cliente_id);
    httpMock.expectOne(apiUrl(`/clientes/${propiedad.cliente_id}/propiedades`)).flush([
      propiedadRecargadaSinInicial,
    ]);
    await loadClientePropsP;

    const actual = service.getPropiedadById(propiedad.id);
    expect(actual?.saldo_inicial).toBe(100000);
    expect(actual ? service.getTotalCobradoParaPropiedad(actual) : 0).toBe(100000);
    expect(actual ? service.getDeudaActualParaPropiedad(actual) : 0).toBe(70000);
  });

  it('recupera el saldo inicial desde el detalle para la vista cliente', async () => {
    const clienteId = 'cliente-1';
    const propiedadListado: Propiedad = {
      id: 'prop-cliente',
      cliente_id: clienteId,
      tipo_propiedad: 'apartamento',
      identificador: 'Apto Cliente',
      direccion: 'Calle Cliente',
      notas: '',
      ...sampleCobroPropiedad,
      monto_a_la_fecha: 130000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const propiedadDetalle: Propiedad = {
      ...propiedadListado,
      saldo_inicial: 100000,
      monto_a_la_fecha: 130000,
    };
    const pago: HistorialPago = {
      id: 'hist-cliente',
      propiedad_id: propiedadListado.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 90000,
      valor_pagado: 30000,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 130000,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };

    const loadListadoP = service.loadPropiedadesByCliente(clienteId);
    httpMock.expectOne(apiUrl(`/clientes/${clienteId}/propiedades`)).flush([propiedadListado]);
    const listado = await loadListadoP;

    const loadDetalleP = service.loadPropiedadDetallesForPropiedades(listado);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedadListado.id}`)).flush(propiedadDetalle);
    const [detalle] = await loadDetalleP;

    const loadHistorialP = service.loadHistorialesForPropiedades([detalle]);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedadListado.id}/historial`)).flush([pago]);
    await loadHistorialP;

    const actual = service.getPropiedadById(propiedadListado.id);
    expect(actual?.saldo_inicial).toBe(100000);
    expect(actual ? service.getDeudaActualParaPropiedad(actual) : 0).toBe(70000);
  });

  it('deduce valor inicial legacy como monto backend menos pagos', async () => {
    const propiedad: Propiedad = {
      id: 'prop-legacy',
      cliente_id: 'cliente-1',
      tipo_propiedad: 'apartamento',
      identificador: 'Apto Legacy',
      direccion: 'Calle Legacy',
      notas: '',
      ...sampleCobroPropiedad,
      monto_a_la_fecha: 130000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const pago: HistorialPago = {
      id: 'hist-legacy',
      propiedad_id: propiedad.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 90000,
      valor_pagado: 30000,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 130000,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };

    const loadPropiedadP = service.loadPropiedad(propiedad.id);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}`)).flush(propiedad);
    const loaded = await loadPropiedadP;

    const loadHistorialP = service.loadHistorialesForPropiedades([loaded]);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}/historial`)).flush([pago]);
    await loadHistorialP;

    expect(service.getTotalCobradoParaPropiedad(loaded)).toBe(100000);
    expect(service.getDeudaActualParaPropiedad(loaded)).toBe(70000);
  });

  it('repara saldo inicial inflado por el bug anterior', async () => {
    const propiedad: Propiedad = {
      id: 'prop-inflada',
      cliente_id: 'cliente-1',
      tipo_propiedad: 'apartamento',
      identificador: 'Apto Inflada',
      direccion: 'Calle Inflada',
      notas: '',
      ...sampleCobroPropiedad,
      saldo_inicial: 130000,
      monto_a_la_fecha: 130000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const pago: HistorialPago = {
      id: 'hist-inflada',
      propiedad_id: propiedad.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 90000,
      valor_pagado: 30000,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 130000,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };

    const loadPropiedadP = service.loadPropiedad(propiedad.id);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}`)).flush(propiedad);
    const loaded = await loadPropiedadP;

    const loadHistorialP = service.loadHistorialesForPropiedades([loaded]);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}/historial`)).flush([pago]);
    await loadHistorialP;

    expect(service.getTotalCobradoParaPropiedad(loaded)).toBe(100000);
    expect(service.getDeudaActualParaPropiedad(loaded)).toBe(70000);
  });

  it('repara saldo inicial cuando quedo como deuda real mas pagos', async () => {
    const propiedad: Propiedad = {
      id: 'prop-inflada-mas-pago',
      cliente_id: 'cliente-1',
      tipo_propiedad: 'apartamento',
      identificador: 'Apto Inflada Mas Pago',
      direccion: 'Calle Inflada Mas Pago',
      notas: '',
      ...sampleCobroPropiedad,
      saldo_inicial: 130000,
      monto_a_la_fecha: 100000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const pago: HistorialPago = {
      id: 'hist-inflada-mas-pago',
      propiedad_id: propiedad.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 90000,
      valor_pagado: 30000,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 100000,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };

    const loadPropiedadP = service.loadPropiedad(propiedad.id);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}`)).flush(propiedad);
    const loaded = await loadPropiedadP;

    const loadHistorialP = service.loadHistorialesForPropiedades([loaded]);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedad.id}/historial`)).flush([pago]);
    await loadHistorialP;

    expect(service.getTotalCobradoParaPropiedad(loaded)).toBe(100000);
    expect(service.getDeudaActualParaPropiedad(loaded)).toBe(70000);
  });

  it('updateCuenta should reload client cuentas after PATCH so UI reflects server state', async () => {
    const clienteId = 'cliente-1';
    const cuentaId = 'cu-1';
    const initial: Cuenta = {
      id: cuentaId,
      cliente_id: clienteId,
      numero_cuenta: 'CTA-OLD',
      tipo: 'juridica',
      estado: 'activa',
      etapa_proceso: 'radicacion',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const afterReload: Cuenta = {
      ...initial,
      numero_cuenta: 'CTA-NEW',
      estado: 'en_proceso',
      etapa_proceso: 'mandamiento_de_pago',
    };

    const loadP = service.loadCuentasByCliente(clienteId);
    const reqLoad0 = httpMock.expectOne(apiUrl(`/clientes/${clienteId}/cuentas`));
    reqLoad0.flush([initial]);
    await loadP;

    const updateP = service.updateCuenta(cuentaId, {
      numero_cuenta: 'CTA-NEW',
      tipo: 'juridica',
      estado: 'en_proceso',
      etapa_proceso: 'mandamiento_de_pago',
      propiedad_id: undefined,
    });

    const reqPatch = httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}`));
    reqPatch.flush({});
    await Promise.resolve();

    const reqLoad1 = httpMock.expectOne(apiUrl(`/clientes/${clienteId}/cuentas`));
    reqLoad1.flush([afterReload]);
    // Dejar que la promesa de updateCuenta avance hasta solicitar métricas (macrotarea; Promise.resolve no basta en Vitest).
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const reqMetrics = httpMock.expectOne(apiUrl('/metrics/dashboard'));
    reqMetrics.flush({ total_cartera: 0, clientes_activos: 0, cuentas_activas: 0 });

    const result = await updateP;
    expect(result.numero_cuenta).toBe('CTA-NEW');
    expect(result.estado).toBe('en_proceso');
    const listed = service.getCuentasByCliente(clienteId);
    expect(listed).toEqual([afterReload]);
  });

  it('updateCliente should PATCH and upsert client in signal', async () => {
    const clienteId = 'cliente-1';
    const initial: Cliente = {
      id: clienteId,
      nombre: 'Antes',
      tipo_persona: 'natural',
      documento: '123',
      telefono: '300',
      email: 'a@test.com',
      direccion: 'Calle 1',
      observaciones: '',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const updated: Cliente = { ...initial, nombre: 'Después', telefono: '310' };

    service['clientesSignal'].set([initial]);

    const updateP = service.updateCliente(clienteId, {
      nombre: 'Después',
      telefono: '310',
      email: 'a@test.com',
      direccion: 'Calle 1',
      observaciones: '',
    });

    const req = httpMock.expectOne(apiUrl(`/clientes/${clienteId}`));
    expect(req.request.method).toBe('PATCH');
    req.flush(updated);

    const result = await updateP;
    expect(result.nombre).toBe('Después');
    expect(service.getClienteById(clienteId)?.nombre).toBe('Después');
  });

  it('updateGestion and deleteGestion should call nested routes and reload list', async () => {
    const propiedadId = 'prop-1';
    const gestionId = 'gest-1';
    const items: Gestion[] = [
      {
        id: gestionId,
        propiedad_id: propiedadId,
        fecha: '2026-06-01',
        estado: 'pendiente',
        descripcion: 'Llamada',
        created_at: '2026-06-01T00:00:00.000Z',
      },
    ];
    const updated: Gestion = { ...items[0], descripcion: 'Llamada actualizada', estado: 'enviado' };

    const updateP = service.updateGestion(propiedadId, gestionId, {
      fecha: '2026-06-01',
      estado: 'enviado',
      descripcion: 'Llamada actualizada',
    });
    const reqPatch = httpMock.expectOne(apiUrl(`/propiedades/${propiedadId}/gestiones/${gestionId}`));
    expect(reqPatch.request.method).toBe('PATCH');
    reqPatch.flush(updated);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const reqLoad0 = httpMock.expectOne(apiUrl(`/propiedades/${propiedadId}/gestiones`));
    reqLoad0.flush([updated]);
    await updateP;
    expect(service.getGestionesByPropiedad(propiedadId)[0].descripcion).toBe('Llamada actualizada');

    const deleteP = service.deleteGestion(propiedadId, gestionId);
    const reqDel = httpMock.expectOne(apiUrl(`/propiedades/${propiedadId}/gestiones/${gestionId}`));
    expect(reqDel.request.method).toBe('DELETE');
    reqDel.flush(null);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const reqLoad1 = httpMock.expectOne(apiUrl(`/propiedades/${propiedadId}/gestiones`));
    reqLoad1.flush([]);
    await deleteP;
    expect(service.getGestionesByPropiedad(propiedadId)).toEqual([]);
  });

  it('sendPaymentReminderEmail posts propiedad_id y cuerpo al endpoint de recordatorios', async () => {
    const propiedadId = '11111111-1111-1111-1111-111111111111';
    const propiedad: Propiedad = {
      id: propiedadId,
      cliente_id: 'cliente-1',
      tipo_propiedad: 'apartamento',
      identificador: 'APT-101',
      direccion: 'Calle 1',
      notas: '',
      ...sampleCobroPropiedad,
      saldo_inicial: 150000,
      monto_a_la_fecha: 150000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const payload = {
      body_html: '<!DOCTYPE html><html><body>Mensaje HTML</body></html>',
      body_text: 'Mensaje del admin en texto plano',
    };
    const sendP = service.sendPaymentReminderEmail(propiedadId, payload);
    httpMock.expectOne(apiUrl(`/propiedades/${propiedadId}`)).flush(propiedad);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = httpMock.expectOne(apiUrl('/payment-reminders/email/send'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      propiedad_id: propiedadId,
      body_html: payload.body_html,
      body_text: payload.body_text,
    });
    req.flush({
      id: 'rem-1',
      propiedad_id: propiedadId,
      cliente_email: 'cliente@example.com',
      subject: 'Recordatorio de pago - APT-101',
      status: 'sent',
      provider_id: '<msg@test>',
      error_message: null,
      sent_at: '2026-05-21T12:00:00.000Z',
      created_at: '2026-05-21T12:00:00.000Z',
    });
    const result = await sendP;
    expect(result.status).toBe('sent');
    expect(result.cliente_email).toBe('cliente@example.com');
  });

});
