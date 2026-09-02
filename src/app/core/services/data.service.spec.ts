import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { Cliente, ProcesoLegal, Gestion, HistorialPago, Cuenta } from '../models';
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

/** Vitest a veces deja un localStorage no persistente; forzamos uno en memoria. */
function installMemoryLocalStorage(): void {
  const map = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memoryStorage,
  });
}

const sampleCobroCuenta = {
  cobro_nombre: 'Contacto Cobro',
  cobro_tipo_persona: 'natural' as const,
  cobro_documento: '123456789',
  cobro_email: 'cobro@test.com',
};

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    installMemoryLocalStorage();
    clearLocalStorage();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpMock?.verify();
    } finally {
      clearLocalStorage();
      TestBed.resetTestingModule();
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should format currency in COP without losing digits', () => {
    expect(service.formatCurrency(9565879)).toBe('$ 9.565.879');
    expect(service.formatCurrency(1000000)).toContain('1.000.000');
  });

  it('formatDeudorTooltip lista todos los deudores y correos', () => {
    const tip = service.formatDeudorTooltip({
      cobro_nombre: 'Juan',
      cobro_tipo_persona: 'natural',
      cobro_documento: '111',
      cobro_email: 'juan@test.com',
      deudores: [
        {
          nombre: 'Juan',
          tipo_persona: 'natural',
          documento: '111',
          emails: ['juan@test.com', 'juan2@test.com'],
        },
        {
          nombre: 'María',
          tipo_persona: 'natural',
          documento: '222',
          emails: ['maria@test.com'],
        },
      ],
    });
    expect(tip).toContain('Deudor 1: Juan');
    expect(tip).toContain('• juan2@test.com');
    expect(tip).toContain('Deudor 2: María');
    expect(tip).toContain('Correo: maria@test.com');
    expect(service.formatDeudorCorto({
      cobro_nombre: 'Juan',
      cobro_tipo_persona: 'natural',
      cobro_documento: '111',
      cobro_email: 'juan@test.com',
      deudores: [
        { nombre: 'Juan', tipo_persona: 'natural', documento: '111', emails: ['juan@test.com'] },
        { nombre: 'María', tipo_persona: 'natural', documento: '222', emails: ['maria@test.com'] },
      ],
    })).toBe('Juan +1');
    expect(service.formatDeudorEmailCorto({
      cobro_nombre: 'Juan',
      cobro_tipo_persona: 'natural',
      cobro_documento: '111',
      cobro_email: 'juan@test.com',
      deudores: [
        { nombre: 'Juan', tipo_persona: 'natural', documento: '111', emails: ['juan@test.com', 'juan2@test.com'] },
        { nombre: 'María', tipo_persona: 'natural', documento: '222', emails: ['maria@test.com'] },
      ],
    })).toBe('juan@test.com +2');
  });

  it('formatDeudorEmailCorto usa teléfono si no hay correo', () => {
    expect(
      service.formatDeudorEmailCorto({
        cobro_nombre: 'Luis',
        cobro_tipo_persona: 'natural',
        cobro_documento: '88',
        cobro_email: '',
        deudores: [
          {
            nombre: 'Luis',
            tipo_persona: 'natural',
            documento: '88',
            emails: [],
            telefono: '3001234567',
          },
        ],
      }),
    ).toBe('3001234567');
    expect(
      service.formatDeudorTooltip({
        cobro_nombre: 'Luis',
        cobro_tipo_persona: 'natural',
        cobro_documento: '88',
        cobro_email: '',
        deudores: [
          {
            nombre: 'Luis',
            tipo_persona: 'natural',
            documento: '88',
            emails: [],
            telefono: '3001234567',
          },
        ],
      }),
    ).toContain('Teléfono: 3001234567');
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
    expect(service.formatFechaCorta('2026-03-15T12:00:00.000Z')).not.toBe('—');
  });

  it('resumen de cobro usa created_at si no hay fecha_inicio_cobro', () => {
    const cuenta: Cuenta = {
      id: 'prop-inicio-alta',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto Alta',
      direccion: 'Calle 1',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 1000,
      monto_a_la_fecha: 1000,
      created_at: '2026-08-12T15:00:00.000Z',
      fecha_inicio_cobro: null,
    };
    const resumen = service.getResumenMoraCobroParaCuenta(cuenta);
    expect(resumen.fecha_inicio_cobro).toBe('2026-08-12');
    expect(resumen.fecha_alta).toBe('2026-08-12');
    expect(service.formatFechaCorta(resumen.fecha_inicio_cobro)).not.toBe('—');
    expect(service.formatResumenMoraTooltip(resumen)).toContain('Inicio cobro');
    expect(service.formatResumenMoraTooltip(resumen)).not.toContain('Inicio cobro: —');
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
      cuenta_id: 'p-1',
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
      cuenta_id: 'p-1',
      fecha: '2026-06-05',
      estado: 'pendiente',
      descripcion: 'Llamada',
      created_at: '2026-06-05T14:45:00.000Z',
    });

    expect(formatted).not.toBe('—');
    expect(formatted).toMatch(/\d/);
  });

  it('calcula la deuda del historial con la misma base de la card', async () => {
    const cuenta: Cuenta = {
      id: 'prop-1',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto 101',
      direccion: 'Calle 1',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 1000,
      monto_a_la_fecha: 9999,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const enero: HistorialPago = {
      id: 'hist-enero',
      cuenta_id: cuenta.id,
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

    const loadP = service.loadHistorialByCuenta(cuenta.id);
    const reqLoad = httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}/historial`));
    reqLoad.flush([febrero, enero]);
    await loadP;

    expect(service.getDeudaParaHistorialPago(cuenta, enero)).toBe(800);
    expect(service.getDeudaParaHistorialPago(cuenta, febrero)).toBe(500);
    expect(service.getDeudaActualParaCuenta(cuenta)).toBe(500);
  });

  it('should get total cartera', () => {
    const total = service.getTotalCartera();
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it('calcula cartera total como suma de deuda a la fecha por cuenta', async () => {
    const propA: Cuenta = {
      id: 'prop-a',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto A',
      direccion: 'Calle A',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 1000,
      monto_a_la_fecha: 1000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const propB: Cuenta = {
      ...propA,
      id: 'prop-b',
      identificador: 'Apto B',
      saldo_inicial: 2000,
      monto_a_la_fecha: 2000,
    };
    const histA: HistorialPago = {
      id: 'hist-a',
      cuenta_id: propA.id,
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
      cuenta_id: propB.id,
      valor_pagado: 750,
    };

    const loadPropsP = service.loadCuentas();
    const reqProps = httpMock.expectOne(apiUrl('/cuentas'));
    reqProps.flush([propA, propB]);
    await loadPropsP;

    const loadHistP = service.loadHistorialesForCuentas([propA, propB]);
    httpMock.expectOne(apiUrl(`/cuentas/${propA.id}/historial`)).flush([histA]);
    httpMock.expectOne(apiUrl(`/cuentas/${propB.id}/historial`)).flush([histB]);
    await loadHistP;

    expect(service.getTotalCartera()).toBe(2000);
  });

  it('conserva el saldo inicial al recargar cuentas sin saldo_inicial', async () => {
    const cuenta: Cuenta = {
      id: 'prop-preserve',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto Preserve',
      direccion: 'Calle Preserve',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 100000,
      monto_a_la_fecha: 100000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const propiedadRecargadaSinInicial: Cuenta = {
      id: cuenta.id,
      cliente_id: cuenta.cliente_id,
      tipo_cuenta: cuenta.tipo_cuenta,
      identificador: cuenta.identificador,
      direccion: cuenta.direccion,
      notas: cuenta.notas,
      ...sampleCobroCuenta,
      monto_a_la_fecha: 130000,
      created_at: cuenta.created_at,
    };
    const pago: HistorialPago = {
      id: 'hist-preserve',
      cuenta_id: cuenta.id,
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

    const loadCuentaP = service.loadCuenta(cuenta.id);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}`)).flush(cuenta);
    await loadCuentaP;

    const loadHistorialP = service.loadHistorialByCuenta(cuenta.id);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}/historial`)).flush([pago]);
    await loadHistorialP;

    const loadClientePropsP = service.loadCuentasByCliente(cuenta.cliente_id);
    httpMock.expectOne(apiUrl(`/clientes/${cuenta.cliente_id}/cuentas`)).flush([
      propiedadRecargadaSinInicial,
    ]);
    await loadClientePropsP;

    const actual = service.getCuentaById(cuenta.id);
    expect(actual?.saldo_inicial).toBe(100000);
    expect(actual ? service.getTotalCobradoParaCuenta(actual) : 0).toBe(100000);
    expect(actual ? service.getDeudaActualParaCuenta(actual) : 0).toBe(70000);
  });

  it('recupera el saldo inicial desde el detalle para la vista cliente', async () => {
    const clienteId = 'cliente-1';
    const propiedadListado: Cuenta = {
      id: 'prop-cliente',
      cliente_id: clienteId,
      tipo_cuenta: 'apartamento',
      identificador: 'Apto Cliente',
      direccion: 'Calle Cliente',
      notas: '',
      ...sampleCobroCuenta,
      monto_a_la_fecha: 130000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const propiedadDetalle: Cuenta = {
      ...propiedadListado,
      saldo_inicial: 100000,
      monto_a_la_fecha: 130000,
    };
    const pago: HistorialPago = {
      id: 'hist-cliente',
      cuenta_id: propiedadListado.id,
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

    const loadListadoP = service.loadCuentasByCliente(clienteId);
    httpMock.expectOne(apiUrl(`/clientes/${clienteId}/cuentas`)).flush([propiedadListado]);
    const listado = await loadListadoP;

    const loadDetalleP = service.loadCuentaDetallesForCuentas(listado);
    httpMock.expectOne(apiUrl(`/cuentas/${propiedadListado.id}`)).flush(propiedadDetalle);
    const [detalle] = await loadDetalleP;

    const loadHistorialP = service.loadHistorialesForCuentas([detalle]);
    httpMock.expectOne(apiUrl(`/cuentas/${propiedadListado.id}/historial`)).flush([pago]);
    await loadHistorialP;

    const actual = service.getCuentaById(propiedadListado.id);
    expect(actual?.saldo_inicial).toBe(100000);
    expect(actual ? service.getDeudaActualParaCuenta(actual) : 0).toBe(70000);
  });

  it('deduce valor inicial legacy como monto backend menos pagos', async () => {
    const cuenta: Cuenta = {
      id: 'prop-legacy',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto Legacy',
      direccion: 'Calle Legacy',
      notas: '',
      ...sampleCobroCuenta,
      monto_a_la_fecha: 130000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const pago: HistorialPago = {
      id: 'hist-legacy',
      cuenta_id: cuenta.id,
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

    const loadCuentaP = service.loadCuenta(cuenta.id);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}`)).flush(cuenta);
    const loaded = await loadCuentaP;

    const loadHistorialP = service.loadHistorialesForCuentas([loaded]);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}/historial`)).flush([pago]);
    await loadHistorialP;

    expect(service.getTotalCobradoParaCuenta(loaded)).toBe(100000);
    expect(service.getDeudaActualParaCuenta(loaded)).toBe(70000);
  });

  it('repara saldo inicial inflado por el bug anterior', async () => {
    const cuenta: Cuenta = {
      id: 'prop-inflada',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto Inflada',
      direccion: 'Calle Inflada',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 130000,
      monto_a_la_fecha: 130000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const pago: HistorialPago = {
      id: 'hist-inflada',
      cuenta_id: cuenta.id,
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

    const loadCuentaP = service.loadCuenta(cuenta.id);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}`)).flush(cuenta);
    const loaded = await loadCuentaP;

    const loadHistorialP = service.loadHistorialesForCuentas([loaded]);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}/historial`)).flush([pago]);
    await loadHistorialP;

    // Simula datos legacy sin lock (el load habría fijado el valor inflado).
    globalThis.localStorage.removeItem(`legal.saldoInicial.${cuenta.id}`);
    expect(service.getTotalCobradoParaCuenta(loaded)).toBe(100000);
    expect(service.getDeudaActualParaCuenta(loaded)).toBe(70000);
  });

  it('repara saldo inicial cuando quedo como deuda real mas pagos', async () => {
    const cuenta: Cuenta = {
      id: 'prop-inflada-mas-pago',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto Inflada Mas Pago',
      direccion: 'Calle Inflada Mas Pago',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 130000,
      monto_a_la_fecha: 100000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const pago: HistorialPago = {
      id: 'hist-inflada-mas-pago',
      cuenta_id: cuenta.id,
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

    const loadCuentaP = service.loadCuenta(cuenta.id);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}`)).flush(cuenta);
    const loaded = await loadCuentaP;

    const loadHistorialP = service.loadHistorialesForCuentas([loaded]);
    httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}/historial`)).flush([pago]);
    await loadHistorialP;

    globalThis.localStorage.removeItem(`legal.saldoInicial.${cuenta.id}`);
    expect(service.getTotalCobradoParaCuenta(loaded)).toBe(100000);
    expect(service.getDeudaActualParaCuenta(loaded)).toBe(70000);
  });

  it('updateProcesoLegal should reload client cuentas after PATCH so UI reflects server state', async () => {
    const clienteId = 'cliente-1';
    const cuentaId = 'cu-1';
    const initial: ProcesoLegal = {
      id: cuentaId,
      cliente_id: clienteId,
      numero_cuenta: 'CTA-OLD',
      tipo: 'juridica',
      estado: 'activa',
      etapa_proceso: 'radicacion',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const afterReload: ProcesoLegal = {
      ...initial,
      numero_cuenta: 'CTA-NEW',
      estado: 'en_proceso',
      etapa_proceso: 'mandamiento_de_pago',
    };

    const loadP = service.loadProcesosLegalesByCliente(clienteId);
    const reqLoad0 = httpMock.expectOne(apiUrl(`/clientes/${clienteId}/procesos-legales`));
    reqLoad0.flush([initial]);
    await loadP;

    const updateP = service.updateProcesoLegal(cuentaId, {
      numero_cuenta: 'CTA-NEW',
      tipo: 'juridica',
      estado: 'en_proceso',
      etapa_proceso: 'mandamiento_de_pago',
      cuenta_id: undefined,
    });

    const reqPatch = httpMock.expectOne(apiUrl(`/procesos-legales/${cuentaId}`));
    reqPatch.flush({ ...afterReload });
    await Promise.resolve();

    const reqLoad1 = httpMock.expectOne(apiUrl(`/clientes/${clienteId}/procesos-legales`));
    reqLoad1.flush([afterReload]);
    // Dejar que la promesa de updateProcesoLegal avance hasta solicitar métricas (macrotarea; Promise.resolve no basta en Vitest).
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const reqMetrics = httpMock.expectOne(apiUrl('/metrics/dashboard'));
    reqMetrics.flush({ total_cartera: 0, clientes_activos: 0, cuentas_activas: 0 });

    const result = await updateP;
    expect(result.numero_cuenta).toBe('CTA-NEW');
    expect(result.estado).toBe('en_proceso');
    const listed = service.getProcesosLegalesByCliente(clienteId);
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
    const cuentaId = 'prop-1';
    const gestionId = 'gest-1';
    const items: Gestion[] = [
      {
        id: gestionId,
        cuenta_id: cuentaId,
        fecha: '2026-06-01',
        estado: 'pendiente',
        descripcion: 'Llamada',
        created_at: '2026-06-01T00:00:00.000Z',
      },
    ];
    const updated: Gestion = { ...items[0], descripcion: 'Llamada actualizada', estado: 'enviado' };

    const updateP = service.updateGestion(cuentaId, gestionId, {
      fecha: '2026-06-01',
      estado: 'enviado',
      descripcion: 'Llamada actualizada',
    });
    const reqPatch = httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}/gestiones/${gestionId}`));
    expect(reqPatch.request.method).toBe('PATCH');
    reqPatch.flush(updated);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const reqLoad0 = httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}/gestiones`));
    reqLoad0.flush([updated]);
    await updateP;
    expect(service.getGestionesByCuenta(cuentaId)[0].descripcion).toBe('Llamada actualizada');
    expect(service.getGestionDescripcion(service.getGestionesByCuenta(cuentaId)[0])).toBe(
      'Llamada actualizada'
    );

    const deleteP = service.deleteGestion(cuentaId, gestionId);
    const reqDel = httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}/gestiones/${gestionId}`));
    expect(reqDel.request.method).toBe('DELETE');
    reqDel.flush(null);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const reqLoad1 = httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}/gestiones`));
    reqLoad1.flush([]);
    await deleteP;
    expect(service.getGestionesByCuenta(cuentaId)).toEqual([]);
  });

  it('updateCuenta actualiza el saldo inicial y recalcula la deuda', async () => {
    const cuenta: Cuenta = {
      id: 'prop-edit-saldo',
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'Apto Edit',
      direccion: 'Calle Edit',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 100000,
      monto_a_la_fecha: 100000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const pago: HistorialPago = {
      id: 'hist-edit-saldo',
      cuenta_id: cuenta.id,
      periodo: '2026-01',
      concepto: 'administracion',
      valor_cobrado: 0,
      valor_pagado: 30000,
      fecha_pago: '2026-01-10',
      estado_pago: 'parcial',
      monto_a_la_fecha: 70000,
      observaciones: '',
      created_at: '2026-01-10T00:00:00.000Z',
    };

    service['cuentasSignal'].set([cuenta]);
    service['historialByCuentaSignal'].set({ [cuenta.id]: [pago] });
    expect(service.getDeudaActualParaCuenta(cuenta)).toBe(70000);

    const updateP = service.updateCuenta(cuenta.id, { saldo_inicial: 80000 });
    const reqPatch = httpMock.expectOne(apiUrl(`/cuentas/${cuenta.id}`));
    expect(reqPatch.request.method).toBe('PATCH');
    expect(reqPatch.request.body).toEqual({ saldo_inicial: 80000 });
    reqPatch.flush({ ...cuenta, saldo_inicial: 80000, monto_a_la_fecha: 50000 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const reqReload = httpMock.expectOne(apiUrl(`/clientes/${cuenta.cliente_id}/cuentas`));
    reqReload.flush([{ ...cuenta, saldo_inicial: 80000, monto_a_la_fecha: 50000 }]);
    const updated = await updateP;

    expect(updated.saldo_inicial).toBe(80000);
    expect(service.getTotalCobradoParaCuenta(updated)).toBe(80000);
    expect(service.getDeudaActualParaCuenta(updated)).toBe(50000);
  });

  it('createCuenta envía deudores y normaliza espejo cobro_*', async () => {
    const deudores = [
      {
        nombre: 'Juan',
        tipo_persona: 'natural' as const,
        documento: '111',
        emails: ['juan@test.com', 'juan2@test.com'],
      },
      {
        nombre: 'María',
        tipo_persona: 'natural' as const,
        documento: '222',
        emails: ['maria@test.com'],
      },
    ];
    const payload = {
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento' as const,
      identificador: 'Apto Multi',
      direccion: 'Calle 2',
      notas: '',
      saldo_inicial: 50000,
      deudores,
      cobro_nombre: 'Juan',
      cobro_tipo_persona: 'natural' as const,
      cobro_documento: '111',
      cobro_email: 'juan@test.com',
    };

    const createP = service.createCuenta(payload);
    const req = httpMock.expectOne(apiUrl('/cuentas'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.deudores).toEqual(deudores);
    expect(req.request.body.cobro_email).toBe('juan@test.com');

    // Backend legacy: solo responde cobro_* sin deudores.
    req.flush({
      id: 'prop-multi',
      ...payload,
      deudores: undefined,
      monto_a_la_fecha: 50000,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const reqReload = httpMock.expectOne(apiUrl('/clientes/cliente-1/cuentas'));
    reqReload.flush([
      {
        id: 'prop-multi',
        ...payload,
        deudores,
        monto_a_la_fecha: 50000,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const created = await createP;

    expect(created.deudores).toHaveLength(2);
    expect(created.cobro_email).toBe('juan@test.com');
    expect(created.deudores?.[0].emails).toContain('juan2@test.com');
  });

  it('createCuenta conserva deudores extra si el reload del API solo espeja cobro_*', async () => {
    const deudores = [
      {
        nombre: 'Juan',
        tipo_persona: 'natural' as const,
        documento: '111',
        emails: ['juan@test.com'],
      },
      {
        nombre: 'María',
        tipo_persona: 'natural' as const,
        documento: '222',
        emails: ['maria@test.com'],
      },
    ];
    const payload = {
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento' as const,
      identificador: 'Apto Multi Truncado',
      direccion: 'Calle 2',
      notas: '',
      saldo_inicial: 50000,
      deudores,
      cobro_nombre: 'Juan',
      cobro_tipo_persona: 'natural' as const,
      cobro_documento: '111',
      cobro_email: 'juan@test.com',
    };

    const createP = service.createCuenta(payload);
    const req = httpMock.expectOne(apiUrl('/cuentas'));
    req.flush({
      id: 'prop-trunc',
      ...payload,
      deudores: [deudores[0]],
      monto_a_la_fecha: 50000,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const reqReload = httpMock.expectOne(apiUrl('/clientes/cliente-1/cuentas'));
    reqReload.flush([
      {
        id: 'prop-trunc',
        ...payload,
        deudores: [deudores[0]],
        cobro_nombre: 'Juan',
        cobro_email: 'juan@test.com',
        monto_a_la_fecha: 50000,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    await createP;

    const stored = service.getCuentaById('prop-trunc');
    expect(stored?.deudores).toHaveLength(2);
    expect(stored?.deudores?.[1].nombre).toBe('María');
  });

  it('loadCuentas sintetiza deudores desde cobro_* legacy', async () => {
    const loadP = service.loadCuentas();
    const req = httpMock.expectOne(apiUrl('/cuentas'));
    req.flush([
      {
        id: 'prop-legacy',
        cliente_id: 'c-1',
        tipo_cuenta: 'casa',
        identificador: 'Casa 1',
        direccion: 'Calle',
        notas: '',
        ...sampleCobroCuenta,
        monto_a_la_fecha: 10,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const items = await loadP;
    expect(items[0].deudores).toEqual([
      {
        nombre: 'Contacto Cobro',
        tipo_persona: 'natural',
        documento: '123456789',
        emails: ['cobro@test.com'],
        telefono: null,
      },
    ]);
  });

  it('sendPaymentReminderEmail posts cuenta_id y cuerpo al endpoint de recordatorios', async () => {
    const cuentaId = '11111111-1111-1111-1111-111111111111';
    const cuenta: Cuenta = {
      id: cuentaId,
      cliente_id: 'cliente-1',
      tipo_cuenta: 'apartamento',
      identificador: 'APT-101',
      direccion: 'Calle 1',
      notas: '',
      ...sampleCobroCuenta,
      saldo_inicial: 150000,
      monto_a_la_fecha: 150000,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const payload = {
      body_html: '<!DOCTYPE html><html><body>Mensaje HTML</body></html>',
      body_text: 'Mensaje del admin en texto plano',
    };
    const sendP = service.sendPaymentReminderEmail(cuentaId, payload);
    httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}`)).flush(cuenta);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = httpMock.expectOne(apiUrl('/payment-reminders/email/send'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      cuenta_id: cuentaId,
      body_html: payload.body_html,
      body_text: payload.body_text,
    });
    req.flush({
      id: 'rem-1',
      cuenta_id: cuentaId,
      cliente_email: 'cliente@example.com',
      extra_recipients: ['cc@example.com'],
      subject: 'Recordatorio de pago - APT-101',
      body_html: payload.body_html,
      body_text: payload.body_text,
      status: 'sent',
      provider_id: '<msg@test>',
      error_message: null,
      sent_at: '2026-05-21T12:00:00.000Z',
      created_at: '2026-05-21T12:00:00.000Z',
      gestion_id: 'ges-1',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}/gestiones`)).flush([]);
    const result = await sendP;
    expect(result.status).toBe('sent');
    expect(result.cliente_email).toBe('cliente@example.com');
    expect(result.gestion_id).toBe('ges-1');
  });

  it('loadPaymentRemindersByCuenta y getPaymentReminderById consultan endpoints de recordatorios', async () => {
    const cuentaId = 'prop-rem-1';
    const reminderId = 'rem-detail-1';
    const listItem = {
      id: reminderId,
      cuenta_id: cuentaId,
      cliente_email: 'a@test.com',
      subject: 'Asunto',
      status: 'sent',
      provider_id: null,
      error_message: null,
      sent_at: '2026-07-23T15:00:00.000Z',
      created_at: '2026-07-23T15:00:00.000Z',
      gestion_id: 'g1',
    };
    const loadP = service.loadPaymentRemindersByCuenta(cuentaId);
    const listReq = httpMock.expectOne(apiUrl(`/payment-reminders/cuentas/${cuentaId}/emails`));
    expect(listReq.request.method).toBe('GET');
    listReq.flush([listItem]);
    const listed = await loadP;
    expect(listed).toEqual([listItem]);
    expect(service.getPaymentRemindersByCuenta(cuentaId)[0].id).toBe(reminderId);

    const detailP = service.getPaymentReminderById(reminderId);
    const detailReq = httpMock.expectOne(apiUrl(`/payment-reminders/${reminderId}`));
    expect(detailReq.request.method).toBe('GET');
    detailReq.flush({
      ...listItem,
      body_html: '<p>Hola</p>',
      body_text: 'Hola',
      extra_recipients: ['b@test.com'],
    });
    const detail = await detailP;
    expect(detail.body_text).toBe('Hola');
    expect(detail.extra_recipients).toEqual(['b@test.com']);
  });

  it('isGestionEmailReminder usa tipo; resumen parsea summary del JSON en descripcion', () => {
    expect(
      service.isGestionEmailReminder({
        tipo: 'email_reminder',
        detalle: {
          estado: 'enviado',
          descripcion: JSON.stringify({ summary: 'Recordatorio de pago…' }),
        },
      })
    ).toBe(true);
    expect(
      service.isGestionEmailReminder({
        tipo: 'manual',
        detalle: { estado: 'pendiente', descripcion: 'Llamada' },
      })
    ).toBe(false);
    expect(
      service.getGestionDescripcion({
        tipo: 'email_reminder',
        descripcion: '',
        detalle: {
          estado: 'enviado',
          descripcion: JSON.stringify({ summary: 'Recordatorio de pago…', foo: 1 }),
        },
      })
    ).toBe('Recordatorio de pago…');
    expect(
      service.getGestionDescripcion({
        tipo: 'manual',
        descripcion: 'Llamada al deudor',
        detalle: { estado: 'pendiente', descripcion: 'Llamada al deudor' },
      })
    ).toBe('Llamada al deudor');
  });

  it('loadGestionesByCuenta normaliza tipo + detalle a campos planos', async () => {
    const cuentaId = 'cuenta-gest';
    const loadP = service.loadGestionesByCuenta(cuentaId);
    const req = httpMock.expectOne(apiUrl(`/cuentas/${cuentaId}/gestiones`));
    req.flush([
      {
        id: 'g1',
        cuenta_id: cuentaId,
        fecha: '2026-07-24T15:00:00.000Z',
        created_at: '2026-07-24T15:00:00.000Z',
        tipo: 'email_reminder',
        detalle: {
          estado: 'enviado',
          descripcion: JSON.stringify({ summary: 'Recordatorio de pago…' }),
        },
      },
      {
        id: 'g2',
        cuenta_id: cuentaId,
        fecha: '2026-07-23',
        created_at: '2026-07-23T10:00:00.000Z',
        tipo: 'manual',
        detalle: {
          estado: 'pendiente',
          descripcion: 'Llamada al deudor',
        },
      },
    ]);
    const items = await loadP;
    expect(items[0].estado).toBe('enviado');
    expect(service.getGestionDescripcion(items[0])).toBe('Recordatorio de pago…');
    expect(service.isGestionEmailReminder(items[0])).toBe(true);
    expect(service.isGestionEmailReminder(items[1])).toBe(false);
    expect(service.getGestionDescripcion(items[1])).toBe('Llamada al deudor');
  });

});
