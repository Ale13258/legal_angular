import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { Cuenta } from '../models';
import { DataService } from './data.service';

function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.endsWith('/') ? environment.apiBaseUrl.slice(0, -1) : environment.apiBaseUrl;
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}${segment}`;
}

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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

  it('should get total cartera', () => {
    const total = service.getTotalCartera();
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(0);
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
      etapa_proceso: 'inicial',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const afterReload: Cuenta = {
      ...initial,
      numero_cuenta: 'CTA-NEW',
      estado: 'en_proceso',
      etapa_proceso: 'notificacion',
    };

    const loadP = service.loadCuentasByCliente(clienteId);
    const reqLoad0 = httpMock.expectOne(apiUrl(`/clientes/${clienteId}/cuentas`));
    reqLoad0.flush([initial]);
    await loadP;

    const updateP = service.updateCuenta(cuentaId, {
      numero_cuenta: 'CTA-NEW',
      tipo: 'juridica',
      estado: 'en_proceso',
      etapa_proceso: 'notificacion',
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

});
