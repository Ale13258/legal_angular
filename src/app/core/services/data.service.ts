import { HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { HttpService } from '../http/http.service';
import type {
  Cliente,
  ConceptoPago,
  Cuenta,
  EstadoCuentaFile,
  EstadoCuentaFileMeta,
  EstadoCuenta,
  EstadoPago,
  EtapaProceso,
  Gestion,
  HistorialPago,
  Propiedad,
  TipoCuenta,
} from '../models';

export type AddHistorialPayload = {
  periodo: string;
  concepto: ConceptoPago;
  valor_cobrado: number;
  valor_pagado: number;
  fecha_pago: string;
  estado_pago: EstadoPago;
  observaciones: string;
};

export type CreatePropiedadPayload = {
  cliente_id: string;
  tipo_propiedad: Propiedad['tipo_propiedad'];
  identificador: string;
  direccion: string;
  notas: string;
  saldo_inicial: number;
};

export type UpdatePropiedadPayload = {
  tipo_propiedad: Propiedad['tipo_propiedad'];
  identificador: string;
  direccion: string;
  notas: string;
  saldo_inicial: number;
};

export type CreateCuentaPayload = {
  cliente_id: string;
  propiedad_id?: string;
  numero_cuenta: string;
  tipo: TipoCuenta;
  estado: EstadoCuenta;
  etapa_proceso: EtapaProceso;
};

export type UpdateCuentaEstadoPayload = {
  estado: EstadoCuenta;
};

export type UpdateCuentaPayload = {
  numero_cuenta: string;
  tipo: TipoCuenta;
  estado: EstadoCuenta;
  etapa_proceso: EtapaProceso;
  propiedad_id?: string;
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpService);
  private readonly clientesSignal = signal<Cliente[]>([]);
  private readonly propiedadesSignal = signal<Propiedad[]>([]);
  private readonly cuentasSignal = signal<Cuenta[]>([]);
  private readonly historialByPropiedadSignal = signal<Record<string, HistorialPago[]>>({});
  private readonly gestionesByPropiedadSignal = signal<Record<string, Gestion[]>>({});
  private readonly estadoCuentaFilesByPropiedadSignal = signal<Record<string, EstadoCuentaFile[]>>({});
  private readonly metricsDashboardSignal = signal({
    total_cartera: 0,
    clientes_activos: 0,
    cuentas_activas: 0,
  });
  private readonly distribucionEstadosSignal = signal<Record<string, number>>({});
  private readonly evolucionSignal = signal<{ periodo: string; total: number }[]>([]);

  readonly conceptoLabels: Record<string, string> = {
    administracion: 'Administración',
    intereses: 'Intereses',
    extraordinaria: 'Extraordinaria',
    otros: 'Otros',
  };
  readonly estadoPagoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    pagado: 'Pagado',
    vencido: 'Vencido',
  };
  readonly tipoCuentaLabels: Record<string, string> = {
    juridica: 'JURÍDICO',
    extrajudicial: 'PRE-JURÍDICO',
    acuerdo_de_pago: 'ACUERDO DE PAGO',
  };
  readonly estadoCuentaLabels: Record<string, string> = {
    activa: 'ACTIVA',
    cerrada: 'FINALIZADO',
    en_proceso: 'EN PROCESO',
  };
  readonly etapaProcesoLabels: Record<string, string> = {
    inicial: 'INICIAL',
    notificacion: 'NOTIFICACIÓN',
    conciliacion: 'CONCILIACIÓN',
    demanda: 'DEMANDA',
    ejecucion: 'EJECUCIÓN',
  };
  readonly estadoGestionLabels: Record<string, string> = {
    recibido: 'RECIBIDO',
    enviado: 'ENVIADO',
    contactado: 'Contactado',
    acordado: 'Acordado',
    programado: 'Programado',
    pendiente: 'PENDIENTE',
  };
  readonly tipoPropiedadLabels: Record<string, string> = {
    apartamento: 'APARTAMENTO',
    oficina: 'OFICINA',
    local: 'LOCAL',
    casa: 'CASA',
    bodega: 'BODEGA',
    garaje: 'GARAJE',
    parqueadero: 'PARQUEADERO',
    otro: 'OTRO',
  };

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  /** Fecha ISO `YYYY-MM-DD` o vacío → texto corto es-CO o em dash. */
  formatFechaCorta(isoDate: string | null | undefined): string {
    if (isoDate == null || String(isoDate).trim() === '') return '—';
    const s = String(isoDate).slice(0, 10);
    const t = Date.parse(s);
    if (!Number.isFinite(t)) return '—';
    return new Date(t).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Días en mora para UI. */
  formatDiasMora(dias: number | null | undefined): string {
    if (dias == null || !Number.isFinite(Number(dias))) return '—';
    const n = Math.max(0, Math.floor(Number(dias)));
    return `${n} días`;
  }

  /**
   * Cobro y mora por **propiedad** (unidad). `fecha_inicio_cobro` viene del API o,
   * si falta, de `propiedad.created_at` (día de alta en la plataforma).
   */
  getResumenMoraCobroParaPropiedad(p: Propiedad): {
    edad_mora_dias: number | null;
    fecha_inicio_cobro: string | null;
    fecha_fin_cobro: string | null;
  } {
    const historial = this.getHistorialByPropiedad(p.id);
    const maxMoraFromHist = this.maxDiasMoraFromHistorial(historial);
    return {
      edad_mora_dias: p.edad_mora_dias ?? maxMoraFromHist,
      fecha_inicio_cobro:
        p.fecha_inicio_cobro?.trim() || this.fechaDiaDesdeIso(p.created_at),
      fecha_fin_cobro: p.fecha_fin_cobro?.trim() || this.fechaFinCobroDesdeHistorial(historial),
    };
  }

  /** `YYYY-MM-DD` desde ISO timestamptz o null. */
  private fechaDiaDesdeIso(iso: string | undefined): string | null {
    if (!iso?.trim()) return null;
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (!year || !month || !day) return null;
    return `${year}-${month}-${day}`;
  }

  /**
   * Fecha fin cobro: primer día en que la deuda acumulada (`monto_a_la_fecha`)
   * llega a 0 o menos.
   */
  private fechaFinCobroDesdeHistorial(rows: HistorialPago[]): string | null {
    if (rows.length === 0) return null;
    const ordenado = rows
      .slice()
      .sort(
        (a, b) =>
          new Date((a.fecha_pago || a.created_at) ?? 0).getTime() -
          new Date((b.fecha_pago || b.created_at) ?? 0).getTime()
      );
    const cierre = ordenado.find((h) => Number.isFinite(Number(h.monto_a_la_fecha)) && Number(h.monto_a_la_fecha) <= 0);
    if (!cierre) return null;
    const fuente = (cierre.fecha_pago || cierre.created_at || '').trim();
    if (!fuente) return null;
    const ymdDirecto = fuente.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymdDirecto)) return ymdDirecto;
    return this.fechaDiaDesdeIso(fuente);
  }

  private maxDiasMoraFromHistorial(rows: HistorialPago[]): number | null {
    let maxMora: number | null = null;
    for (const h of rows) {
      if (h.dias_en_mora != null && Number.isFinite(Number(h.dias_en_mora))) {
        const d = Math.floor(Number(h.dias_en_mora));
        maxMora = maxMora === null ? d : Math.max(maxMora, d);
      }
    }
    return maxMora;
  }

  getClientes(): Cliente[] {
    return this.clientesSignal();
  }

  getClienteById(id: string): Cliente | undefined {
    return this.clientesSignal().find((c) => c.id === id);
  }

  getHistorialByClienteId(clienteId: string): HistorialPago[] {
    const propIds = new Set(
      this.propiedadesSignal()
        .filter((p) => p.cliente_id === clienteId)
        .map((p) => p.id)
    );
    return Object.values(this.historialByPropiedadSignal())
      .flat()
      .filter((h) => propIds.has(h.propiedad_id));
  }

  getPropiedadesByCliente(clienteId: string): Propiedad[] {
    return this.propiedadesSignal().filter((p) => p.cliente_id === clienteId);
  }

  getPropiedadById(id: string): Propiedad | undefined {
    return this.propiedadesSignal().find((p) => p.id === id);
  }

  getHistorialByPropiedad(propiedadId: string): HistorialPago[] {
    return this.historialByPropiedadSignal()[propiedadId] ?? [];
  }

  async addHistorialPago(propiedadId: string, payload: AddHistorialPayload): Promise<HistorialPago> {
    const path = `/propiedades/${propiedadId}/historial`;
    console.log('[LegalDebug][DataService] addHistorialPago -> POST', { path, propiedadId, payload });
    try {
      const record = await this.http.post<HistorialPago>(path, payload);
      console.log('[LegalDebug][DataService] addHistorialPago POST OK', record);
      await this.loadHistorialByPropiedad(propiedadId);
      await this.loadPropiedad(propiedadId);
      console.log('[LegalDebug][DataService] addHistorialPago reloads OK');
      return record;
    } catch (err) {
      console.error('[LegalDebug][DataService] addHistorialPago FAIL', err);
      throw err;
    }
  }

  async deleteHistorialPago(propiedadId: string, historialId: string): Promise<void> {
    const path = `/propiedades/${propiedadId}/historial/${historialId}`;
    await this.http.delete<void>(path);
    await this.loadHistorialByPropiedad(propiedadId);
    await this.loadPropiedad(propiedadId);
  }

  async addGestion(
    propiedadId: string,
    payload: { fecha: string; estado: string; descripcion: string }
  ): Promise<Gestion> {
    const path = `/propiedades/${propiedadId}/gestiones`;
    console.log('[LegalDebug][DataService] addGestion -> POST', { path, propiedadId, payload });
    try {
      const gestion = await this.http.post<Gestion>(path, payload);
      console.log('[LegalDebug][DataService] addGestion POST OK', gestion);
      await this.loadGestionesByPropiedad(propiedadId);
      console.log('[LegalDebug][DataService] addGestion reload OK');
      return gestion;
    } catch (err) {
      console.error('[LegalDebug][DataService] addGestion FAIL', err);
      throw err;
    }
  }

  getCuentasByCliente(clienteId: string): Cuenta[] {
    return this.cuentasSignal().filter((c) => c.cliente_id === clienteId);
  }

  getGestionesByPropiedad(propiedadId: string): Gestion[] {
    return (this.gestionesByPropiedadSignal()[propiedadId] ?? [])
      .slice()
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  getEstadoCuentaFilesByPropiedad(propiedadId: string): EstadoCuentaFile[] {
    return (this.estadoCuentaFilesByPropiedadSignal()[propiedadId] ?? [])
      .slice()
      .sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());
  }

  calcularMontoALaFecha(propiedadId: string): number {
    const historial = this.getHistorialByPropiedad(propiedadId);
    const totalCobrado = historial.reduce((sum, h) => sum + h.valor_cobrado, 0);
    const totalPagado = historial.reduce((sum, h) => sum + h.valor_pagado, 0);
    return totalCobrado - totalPagado;
  }

  getTotalCartera(): number {
    return this.metricsDashboardSignal().total_cartera;
  }

  getClientesActivos(): number {
    return this.metricsDashboardSignal().clientes_activos;
  }

  getCuentasActivas(): number {
    return this.metricsDashboardSignal().cuentas_activas;
  }

  getDistribucionEstados(): Record<string, number> {
    return this.distribucionEstadosSignal();
  }

  getEvolucionCartera(): { periodo: string; total: number }[] {
    return this.evolucionSignal();
  }

  get mockClientes(): Cliente[] {
    return this.clientesSignal();
  }

  get mockPropiedades(): Propiedad[] {
    return this.propiedadesSignal();
  }

  get mockHistorial(): HistorialPago[] {
    return Object.values(this.historialByPropiedadSignal()).flat();
  }

  get mockCuentas(): Cuenta[] {
    return this.cuentasSignal();
  }

  get mockGestiones(): Gestion[] {
    return Object.values(this.gestionesByPropiedadSignal()).flat();
  }

  async loadDashboardData(): Promise<void> {
    await Promise.all([
      this.loadMetricsDashboard(),
      this.loadDistribucionEstados(),
      this.loadClientes(),
    ]);
    await this.loadCuentasForLoadedClientes();
  }

  async loadGraficosData(months = 12): Promise<void> {
    await Promise.all([
      this.loadMetricsDashboard(),
      this.loadDistribucionEstados(),
      this.loadEvolucionCartera(months),
      this.loadClientes(),
      this.loadPropiedades(),
      this.loadCuentasForLoadedClientes(),
    ]);
  }

  async loadClientes(search?: string): Promise<Cliente[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    const items = await this.http.getItems<Cliente>('/clientes', { params });
    this.clientesSignal.set(items);
    return items;
  }

  async loadCliente(id: string): Promise<Cliente> {
    const cliente = await this.http.get<Cliente>(`/clientes/${id}`);
    this.clientesSignal.update((prev) => this.upsertById(prev, cliente));
    return cliente;
  }

  async createCliente(payload: Omit<Cliente, 'id' | 'created_at'>): Promise<Cliente> {
    const cliente = await this.http.post<Cliente>('/clientes', payload);
    this.clientesSignal.update((prev) => [...prev, cliente]);
    await this.loadMetricsDashboard();
    return cliente;
  }

  async createPropiedad(payload: CreatePropiedadPayload): Promise<Propiedad> {
    // El backend calcula automáticamente el saldo/monto_a_la_fecha al crear la propiedad.
    const propiedad = await this.http.post<Propiedad>('/propiedades', payload);
    await this.loadPropiedadesByCliente(payload.cliente_id);
    return propiedad;
  }

  async updatePropiedad(propiedadId: string, payload: UpdatePropiedadPayload): Promise<Propiedad> {
    const propiedad = await this.http.patch<Propiedad>(`/propiedades/${propiedadId}`, payload);
    await this.loadPropiedadesByCliente(propiedad.cliente_id);
    return propiedad;
  }

  async deletePropiedad(propiedadId: string, clienteId: string): Promise<void> {
    await this.http.delete<void>(`/propiedades/${propiedadId}`);
    await this.loadPropiedadesByCliente(clienteId);
  }

  async loadPropiedades(clienteId?: string): Promise<Propiedad[]> {
    const params = clienteId ? new HttpParams().set('cliente_id', clienteId) : undefined;
    const items = await this.http.getItems<Propiedad>('/propiedades', { params });
    if (clienteId) {
      this.propiedadesSignal.update((prev) => {
        const others = prev.filter((p) => p.cliente_id !== clienteId);
        return [...others, ...items];
      });
    } else {
      this.propiedadesSignal.set(items);
    }
    return items;
  }

  async loadPropiedad(id: string): Promise<Propiedad> {
    const propiedad = await this.http.get<Propiedad>(`/propiedades/${id}`);
    const prevPropiedad = this.getPropiedadById(id);
    const normalizedPropiedad = this.normalizePropiedadMonto(propiedad, prevPropiedad);
    this.propiedadesSignal.update((prev) => this.upsertById(prev, normalizedPropiedad));
    return normalizedPropiedad;
  }

  async loadPropiedadesByCliente(clienteId: string): Promise<Propiedad[]> {
    const items = await this.http.getItems<Propiedad>(`/clientes/${clienteId}/propiedades`);
    this.propiedadesSignal.update((prev) => {
      const others = prev.filter((p) => p.cliente_id !== clienteId);
      return [...others, ...items];
    });
    return items;
  }

  async loadCuentasByCliente(clienteId: string): Promise<Cuenta[]> {
    const items = await this.http.getItems<Cuenta>(`/clientes/${clienteId}/cuentas`);
    this.cuentasSignal.update((prev) => {
      const others = prev.filter((c) => c.cliente_id !== clienteId);
      return [...others, ...items];
    });
    return items;
  }

  async createCuenta(payload: CreateCuentaPayload): Promise<Cuenta> {
    const body: Record<string, unknown> = {
      cliente_id: payload.cliente_id,
      numero_cuenta: payload.numero_cuenta,
      tipo: payload.tipo,
      estado: payload.estado,
      etapa_proceso: payload.etapa_proceso,
    };
    if (payload.propiedad_id) {
      body['propiedad_id'] = payload.propiedad_id;
    }
    const cuenta = await this.http.post<Cuenta>('/cuentas', body);
    await this.loadCuentasByCliente(payload.cliente_id);
    await this.loadMetricsDashboard();
    return cuenta;
  }

  async updateCuentaEstado(cuentaId: string, payload: UpdateCuentaEstadoPayload): Promise<Cuenta> {
    const cuenta = await this.http.patch<Cuenta>(`/cuentas/${cuentaId}`, payload);
    this.cuentasSignal.update((prev) => this.upsertById(prev, cuenta));
    await this.loadMetricsDashboard();
    return cuenta;
  }

  async updateCuenta(cuentaId: string, payload: UpdateCuentaPayload): Promise<Cuenta> {
    const body: Record<string, unknown> = {
      numero_cuenta: payload.numero_cuenta,
      tipo: payload.tipo,
      estado: payload.estado,
      etapa_proceso: payload.etapa_proceso,
      propiedad_id: payload.propiedad_id ?? null,
    };
    const clienteId = this.cuentasSignal().find((c) => c.id === cuentaId)?.cliente_id;
    const patched = await this.http.patch<Cuenta>(`/cuentas/${cuentaId}`, body);
    if (clienteId) {
      await this.loadCuentasByCliente(clienteId);
    } else {
      this.cuentasSignal.update((prev) => this.upsertById(prev, patched));
    }
    await this.loadMetricsDashboard();
    if (clienteId) {
      const refreshed = this.getCuentasByCliente(clienteId).find((c) => c.id === cuentaId);
      if (refreshed) return refreshed;
    }
    return patched;
  }

  async deleteCuenta(cuentaId: string, clienteId: string): Promise<void> {
    await this.http.delete<void>(`/cuentas/${cuentaId}`);
    await this.loadCuentasByCliente(clienteId);
    await this.loadMetricsDashboard();
  }

  async loadHistorialByPropiedad(propiedadId: string): Promise<HistorialPago[]> {
    const items = await this.http.getItems<HistorialPago>(`/propiedades/${propiedadId}/historial`);
    this.historialByPropiedadSignal.update((prev) => ({ ...prev, [propiedadId]: items }));
    return items;
  }

  async loadGestionesByPropiedad(propiedadId: string): Promise<Gestion[]> {
    const items = await this.http.getItems<Gestion>(`/propiedades/${propiedadId}/gestiones`);
    this.gestionesByPropiedadSignal.update((prev) => ({ ...prev, [propiedadId]: items }));
    return items;
  }

  async loadEstadoCuentaFilesByPropiedad(propiedadId: string): Promise<EstadoCuentaFile[]> {
    const items = this.readEstadoCuentaFilesFromStorage(propiedadId);
    this.estadoCuentaFilesByPropiedadSignal.update((prev) => ({ ...prev, [propiedadId]: items }));
    return items;
  }

  async uploadEstadoCuentaFileMock(
    propiedadId: string,
    payload: { file: File; notas?: string }
  ): Promise<EstadoCuentaFile> {
    const next: EstadoCuentaFile = {
      id: this.createMockFileId(),
      propiedad_id: propiedadId,
      nombre: payload.file.name,
      tamano_bytes: payload.file.size,
      mime_type: payload.file.type || 'application/octet-stream',
      fecha_subida: new Date().toISOString(),
      notas: payload.notas?.trim() || undefined,
    };
    const current = this.readEstadoCuentaFilesFromStorage(propiedadId);
    const updated = [next, ...current];
    this.writeEstadoCuentaFilesToStorage(propiedadId, updated);
    this.estadoCuentaFilesByPropiedadSignal.update((prev) => ({ ...prev, [propiedadId]: updated }));
    return next;
  }

  async deleteEstadoCuentaFileMock(propiedadId: string, fileId: string): Promise<void> {
    const current = this.readEstadoCuentaFilesFromStorage(propiedadId);
    const updated = current.filter((f) => f.id !== fileId);
    this.writeEstadoCuentaFilesToStorage(propiedadId, updated);
    this.estadoCuentaFilesByPropiedadSignal.update((prev) => ({ ...prev, [propiedadId]: updated }));
  }

  async loadMetricsDashboard(): Promise<void> {
    const metrics = await this.http.get<{
      total_cartera: number;
      clientes_activos: number;
      cuentas_activas: number;
    }>('/metrics/dashboard');
    this.metricsDashboardSignal.set(metrics);
  }

  async loadDistribucionEstados(): Promise<void> {
    const dist = await this.http.get<Record<string, number>>('/metrics/distribucion-estados');
    this.distribucionEstadosSignal.set(dist);
  }

  async loadEvolucionCartera(months = 12): Promise<void> {
    const data = await this.http.get<{ series: { periodo: string; total: number }[] }>(
      '/metrics/evolucion-cartera',
      { params: new HttpParams().set('months', String(months)) }
    );
    this.evolucionSignal.set(data.series ?? []);
  }

  private async loadCuentasForLoadedClientes(): Promise<void> {
    const clientes = this.clientesSignal();
    await Promise.all(clientes.map((c) => this.loadCuentasByCliente(c.id)));
  }

  private upsertById<T extends { id: string }>(items: T[], value: T): T[] {
    const idx = items.findIndex((it) => it.id === value.id);
    if (idx === -1) return [...items, value];
    const copy = items.slice();
    copy[idx] = value;
    return copy;
  }

  private normalizePropiedadMonto(propiedad: Propiedad, prev?: Propiedad): Propiedad {
    const monto = Number(propiedad.monto_a_la_fecha);
    if (Number.isFinite(monto)) {
      return { ...propiedad, monto_a_la_fecha: monto };
    }
    return {
      ...propiedad,
      // Si el detalle no trae monto válido, preservamos el último valor conocido (saldo inicial/monto cargado).
      monto_a_la_fecha: Number(prev?.monto_a_la_fecha ?? 0),
    };
  }

  private estadoCuentaStorageKey(propiedadId: string): string {
    return `legal.estadoCuentaFiles.${propiedadId}`;
  }

  private readEstadoCuentaFilesFromStorage(propiedadId: string): EstadoCuentaFile[] {
    if (typeof globalThis.localStorage === 'undefined') return [];
    const raw = globalThis.localStorage.getItem(this.estadoCuentaStorageKey(propiedadId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as EstadoCuentaFileMeta[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((f) => Boolean(f?.id && f?.nombre && f?.fecha_subida))
        .map((f) => ({
          id: f.id,
          propiedad_id: propiedadId,
          nombre: f.nombre,
          tamano_bytes: Number(f.tamano_bytes) || 0,
          mime_type: String(f.mime_type || 'application/octet-stream'),
          fecha_subida: f.fecha_subida,
          notas: f.notas,
        }));
    } catch {
      return [];
    }
  }

  private writeEstadoCuentaFilesToStorage(propiedadId: string, files: EstadoCuentaFile[]): void {
    if (typeof globalThis.localStorage === 'undefined') return;
    const serialized: EstadoCuentaFileMeta[] = files.map((f) => ({
      id: f.id,
      propiedad_id: propiedadId,
      nombre: f.nombre,
      tamano_bytes: f.tamano_bytes,
      mime_type: f.mime_type,
      fecha_subida: f.fecha_subida,
      notas: f.notas,
    }));
    globalThis.localStorage.setItem(this.estadoCuentaStorageKey(propiedadId), JSON.stringify(serialized));
  }

  private createMockFileId(): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `ecf_${Date.now()}_${random}`;
  }
}
