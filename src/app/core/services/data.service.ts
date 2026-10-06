import { HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  calcularHonorarios,
  resolverProcesoParaCuenta,
  type HonorariosResultado,
} from '../honorarios';
import { etiquetaCortaParaDiasMora, etiquetaParaDiasMora } from '../mora-etapas';
import { buildMoraPorCliente, type MoraPorClienteRow } from '../mora-por-cliente';
import { ETAPA_PROCESO_LABELS, etiquetaEtapaProceso } from '../proceso-etapas';
import { labelEstadoProcesoLegal, variantEstadoProcesoLegal } from '../proceso-estado';
import { HttpService } from '../http/http.service';
import { formatMontoColombianoCurrency } from '../utils/format-monto-colombiano';
import {
  mergeDeudoresAfterWrite,
  mergeDeudoresPreferringComplete,
  normalizeCuentaDeudores,
  resolveDeudores,
} from '../utils/normalize-cuenta-deudores';
import type {
  Cliente,
  ConceptoPago,
  Cuenta,
  DeudorCobro,
  EstadoCuentaFile,
  EstadoCuentaFileMeta,
  EstadoProcesoLegal,
  EstadoPago,
  EtapaProceso,
  Gestion,
  HistorialPago,
  PaymentReminderEmailRecord,
  ProcesoLegal,
  TipoCuenta,
  TipoProcesoLegal,
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

export type CreateCuentaPayload = {
  cliente_id: string;
  tipo_cuenta: Cuenta['tipo_cuenta'];
  identificador: string;
  direccion: string;
  notas: string;
  saldo_inicial: number;
  cobro_nombre: string;
  cobro_tipo_persona: Cuenta['cobro_tipo_persona'];
  cobro_documento: string;
  cobro_email: string;
  /** Fuente de verdad; el espejo `cobro_*` debe coincidir con `deudores[0]`. */
  deudores: DeudorCobro[];
  /** ISO fecha `YYYY-MM-DD`; opcional según contrato del API */
  fecha_inicio_cobro?: string | null;
};

export type UpdateCuentaPayload = {
  tipo_cuenta?: Cuenta['tipo_cuenta'];
  identificador?: string;
  direccion?: string;
  notas?: string;
  saldo_inicial?: number;
  cobro_nombre?: string;
  cobro_tipo_persona?: Cuenta['cobro_tipo_persona'];
  cobro_documento?: string;
  cobro_email?: string;
  deudores?: DeudorCobro[];
  fecha_inicio_cobro?: string | null;
  /** `null` limpia el override y vuelve al % sugerido. */
  honorarios_monto?: number | null;
};

export type CreateProcesoLegalPayload = {
  cliente_id: string;
  cuenta_id: string;
  numero_cuenta: string;
  tipo: TipoProcesoLegal;
  estado: EstadoProcesoLegal;
  etapa_proceso: EtapaProceso;
};

export type UpdateProcesoLegalEstadoPayload = {
  estado: EstadoProcesoLegal;
};

export type UpdateProcesoLegalPayload = {
  numero_cuenta: string;
  tipo: TipoProcesoLegal;
  estado: EstadoProcesoLegal;
  etapa_proceso: EtapaProceso;
  cuenta_id?: string;
};

export type UpdateClientePayload = Pick<
  Cliente,
  'nombre' | 'telefono' | 'email' | 'direccion' | 'observaciones'
>;

export type UpdateGestionPayload = {
  fecha: string;
  estado: string;
  descripcion: string;
};

export type PaymentReminderEmailAttachmentPayload = {
  filename: string;
  content_base64: string;
  mime_type?: string;
};

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpService);
  private readonly clientesSignal = signal<Cliente[]>([]);
  private readonly cuentasSignal = signal<Cuenta[]>([]);
  private readonly procesosLegalesSignal = signal<ProcesoLegal[]>([]);
  private readonly historialByCuentaSignal = signal<Record<string, HistorialPago[]>>({});
  private readonly gestionesByCuentaSignal = signal<Record<string, Gestion[]>>({});
  private readonly paymentRemindersByCuentaSignal = signal<
    Record<string, PaymentReminderEmailRecord[]>
  >({});
  private readonly estadoCuentaFilesByCuentaSignal = signal<Record<string, EstadoCuentaFile[]>>({});
  private readonly metricsDashboardSignal = signal({
    total_cartera: 0,
    clientes_activos: 0,
    cuentas_activas: 0,
    procesos_legales_activos: 0,
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
  readonly tipoProcesoLegalLabels: Record<string, string> = {
    juridica: 'JURÍDICO',
    extrajudicial: 'PRE-JURÍDICO',
    acuerdo_de_pago: 'ACUERDO DE PAGO',
  };
  readonly estadoProcesoLegalLabels: Record<string, string> = {
    activa: 'EN PROCESO',
    cerrada: 'FINALIZADO',
    en_proceso: 'EN PROCESO',
  };

  formatEstadoProcesoLegal(estado: string | null | undefined): string {
    return labelEstadoProcesoLegal(estado);
  }

  variantEstadoProcesoLegal(estado: string | null | undefined): string {
    return variantEstadoProcesoLegal(estado);
  }
  readonly etapaProcesoLabels: Record<string, string> = {
    ...ETAPA_PROCESO_LABELS,
  };

  formatEtapaProceso(etapa: string | null | undefined): string {
    return etiquetaEtapaProceso(etapa);
  }
  readonly estadoGestionLabels: Record<string, string> = {
    recibido: 'RECIBIDO',
    enviado: 'ENVIADO',
    contactado: 'Contactado',
    acordado: 'Acordado',
    programado: 'Programado',
    pendiente: 'PENDIENTE',
  };
  readonly tipoCuentaLabels: Record<string, string> = {
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
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? numeric : 0;
    return formatMontoColombianoCurrency(safeValue);
  }

  formatPorcentaje(value: number): string {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? numeric : 0;
    return `${safeValue.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} %`;
  }

  /** Deuda en UI: nunca negativa. */
  formatDeuda(value: number | null | undefined): string {
    const numeric = Number(value);
    const safeDebt = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
    return this.formatCurrency(safeDebt);
  }

  /**
   * Valor / saldo inicial: estático. Solo se muestra; no se mezcla con cobros del historial.
   */
  getSaldoInicialParaCuenta(p: Cuenta): number {
    return this.resolveSaldoInicialPreservado(p);
  }

  /** @deprecated Alias de `getSaldoInicialParaCuenta`. */
  getAperturaParaCuenta(p: Cuenta): number {
    return this.getSaldoInicialParaCuenta(p);
  }

  /**
   * Total cobrado: Σ valor_cobrado del historial.
   * Si aún no hay cobros, coincide con el valor inicial (deuda de apertura).
   */
  getTotalCobradoParaCuenta(p: Cuenta): number {
    const sumCobrado = this.getSumaValorCobradoParaCuenta(p);
    if (sumCobrado > 0) return sumCobrado;
    return this.getSaldoInicialParaCuenta(p);
  }

  /** Suma de valor_cobrado en el historial de la unidad. */
  getSumaValorCobradoParaCuenta(p: Cuenta): number {
    return this.getHistorialByCuenta(p.id).reduce(
      (sum, h) => sum + this.toMoneyNumber(h.valor_cobrado),
      0,
    );
  }

  /** True cuando ya existe al menos un valor_cobrado &gt; 0 en el historial. */
  hasValorCobradoEnHistorial(p: Cuenta): boolean {
    return this.getSumaValorCobradoParaCuenta(p) > 0;
  }

  /** Suma numérica de todos los pagos registrados en el historial de la unidad. */
  getTotalPagadoParaCuenta(p: Cuenta): number {
    return this.getHistorialByCuenta(p.id).reduce(
      (sum, h) => sum + this.toMoneyNumber(h.valor_pagado),
      0,
    );
  }

  /**
   * Deuda a la fecha:
   * - Si el historial de la unidad aún no está en caché → usa `monto_a_la_fecha` del API
   *   (evita N+1 en listados / dashboard).
   * - Sin valor_cobrado en historial → valor inicial − pagos (al crear = valor inicial).
   * - Con el primer valor_cobrado → Σ cobrado − Σ pagado (ya no usa el inicial).
   */
  getDeudaActualParaCuenta(p: Cuenta): number {
    if (!this.hasHistorialLoaded(p.id)) {
      const monto = Number(p.monto_a_la_fecha);
      return Number.isFinite(monto) ? Math.max(0, monto) : 0;
    }
    const totalPagado = this.getTotalPagadoParaCuenta(p);
    if (!this.hasValorCobradoEnHistorial(p)) {
      return Math.max(0, this.getSaldoInicialParaCuenta(p) - totalPagado);
    }
    return Math.max(0, this.getSumaValorCobradoParaCuenta(p) - totalPagado);
  }

  /**
   * Deuda por fila del historial (misma regla que la card).
   */
  getDeudaParaHistorialPago(p: Cuenta, row: HistorialPago): number {
    const useHistorialCobros = this.hasValorCobradoEnHistorial(p);
    const saldoInicial = useHistorialCobros ? 0 : this.getSaldoInicialParaCuenta(p);
    const historial = this.getHistorialByCuenta(p.id);
    const ordered = historial.slice().sort((a, b) => this.compareHistorialParaSaldo(a, b));
    let totalCobrado = 0;
    let totalPagado = 0;

    for (const h of ordered) {
      totalCobrado += this.toMoneyNumber(h.valor_cobrado);
      totalPagado += this.toMoneyNumber(h.valor_pagado);
      if (h.id === row.id) {
        if (useHistorialCobros) {
          return Math.max(0, totalCobrado - totalPagado);
        }
        return Math.max(0, saldoInicial - totalPagado);
      }
    }

    if (useHistorialCobros) {
      return Math.max(
        0,
        this.toMoneyNumber(row.valor_cobrado) - this.toMoneyNumber(row.valor_pagado),
      );
    }
    return Math.max(0, saldoInicial - this.toMoneyNumber(row.valor_pagado));
  }

  /** Fecha ISO `YYYY-MM-DD` o vacío → texto corto es-CO o em dash. */
  formatFechaCorta(isoDate: string | null | undefined): string {
    if (isoDate == null || String(isoDate).trim() === '') return '—';
    const s = String(isoDate).trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return '—';
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Día y hora simple en es-CO. Si la fecha es solo `YYYY-MM-DD`, conserva ese día y toma la hora del fallback. */
  formatFechaHora(isoDate: string | null | undefined, fallbackIso?: string | null | undefined): string {
    if (isoDate == null || String(isoDate).trim() === '') return '—';
    const raw = String(isoDate).trim();
    const ymd = raw.slice(0, 10);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(ymd);
    const hasExplicitTime = raw.includes('T') && !/T00:00:00(\.000)?Z?$/.test(raw);

    if (dateOnly && !hasExplicitTime) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
      if (!m) return '—';
      let hours = 0;
      let minutes = 0;
      if (fallbackIso?.trim()) {
        const fb = Date.parse(fallbackIso.trim());
        if (Number.isFinite(fb)) {
          const t = new Date(fb);
          hours = t.getHours();
          minutes = t.getMinutes();
        }
      }
      const local = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hours, minutes);
      return local.toLocaleString('es-CO', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return '—';

    return new Date(parsed).toLocaleString('es-CO', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /** Fecha de pago del historial con día y hora. */
  formatFechaPago(h: Pick<HistorialPago, 'fecha_pago' | 'created_at'>): string {
    return this.formatFechaHora(h.fecha_pago, h.created_at);
  }

  /** Fecha y hora legibles para gestiones de cobro. */
  formatGestionFecha(g: Gestion): string {
    return this.formatFechaHora(g.fecha, g.created_at);
  }

  /** Normaliza documento para comparación (quita puntos, guiones y espacios). */
  normalizeDocumentoKey(documento: string): string {
    return String(documento ?? '')
      .trim()
      .replace(/\D/g, '');
  }

  /** Días en mora para UI. */
  formatDiasMora(dias: number | null | undefined): string {
    if (dias == null || !Number.isFinite(Number(dias))) return '—';
    const n = Math.max(0, Math.floor(Number(dias)));
    return `${n} días`;
  }

  /** Etiqueta larga de etapa de cobranza (pre-jurídico / jurídico por tramos). */
  formatEtapaCobranza(dias: number | null | undefined): string {
    return etiquetaParaDiasMora(dias);
  }

  /** Etiqueta corta para tablas y listados. */
  formatEtapaCobranzaCorta(dias: number | null | undefined): string {
    return etiquetaCortaParaDiasMora(dias);
  }

  /**
   * Tooltip en listados: días, etapa de cobranza y fechas de contexto en un solo bloque.
   */
  formatResumenMoraTooltip(r: {
    edad_mora_dias: number | null;
    fecha_inicio_cobro: string | null;
    fecha_fin_cobro: string | null;
    fecha_alta?: string | null;
    identificador?: string;
  }): string {
    return [
      `Días en mora: ${this.formatDiasMora(r.edad_mora_dias)}`,
      this.formatEtapaCobranza(r.edad_mora_dias),
      `Alta en app: ${this.formatFechaCorta(r.fecha_alta)}`,
      `Inicio cobro: ${this.formatFechaCorta(r.fecha_inicio_cobro)}`,
      `Fin cobro: ${this.formatFechaCorta(r.fecha_fin_cobro)}`,
    ].join('\n');
  }

  /** Nombre del deudor (usuario a cobrar) para celdas de tabla. */
  formatDeudorCorto(
    p: Pick<Cuenta, 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email' | 'deudores'>,
  ): string {
    const deudores = resolveDeudores(p);
    const first = deudores[0]?.nombre?.trim() || p.cobro_nombre?.trim();
    if (!first) return '—';
    if (deudores.length <= 1) return first;
    return `${first} +${deudores.length - 1}`;
  }

  /** Resumen corto de contacto para la celda (correo, o teléfono si no hay correo). */
  formatDeudorEmailCorto(
    p: Pick<Cuenta, 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email' | 'deudores'>,
  ): string {
    const deudores = resolveDeudores(p);
    const emails = deudores.flatMap((d) => d.emails).filter(Boolean);
    if (emails.length === 1) return emails[0];
    if (emails.length > 1) return `${emails[0]} +${emails.length - 1}`;
    const legacy = p.cobro_email?.trim();
    if (legacy) return legacy;
    return deudores.map((d) => d.telefono?.trim()).find(Boolean) || '';
  }

  /** Tooltip con todos los deudores y correos de la cuenta. */
  formatDeudorTooltip(
    p: Pick<Cuenta, 'cobro_nombre' | 'cobro_tipo_persona' | 'cobro_documento' | 'cobro_email' | 'deudores'>,
  ): string {
    const deudores = resolveDeudores(p);
    if (!deudores.length) {
      return ['Deudor: —', 'Tipo: —', 'Documento: —', 'Correo: —', 'Teléfono: —'].join('\n');
    }

    const blocks = deudores.map((d, index) => this.formatDeudorBlock(d, index, deudores.length > 1));
    return blocks.join('\n\n');
  }

  private formatDeudorBlock(d: DeudorCobro, index: number, multi: boolean): string {
    const nombre = d.nombre?.trim() || '—';
    const documento = d.documento?.trim() || '—';
    const docLabel = d.tipo_persona === 'natural' ? 'CC' : 'NIT';
    const tipo = d.tipo_persona === 'natural' ? 'Persona natural' : 'Persona jurídica';
    const emails = d.emails.map((e) => e.trim()).filter(Boolean);
    const telefono = d.telefono?.trim() || '';
    const header = multi ? `Deudor ${index + 1}: ${nombre}` : `Deudor: ${nombre}`;
    const lines = [header, `Tipo: ${tipo}`, `${docLabel}: ${documento}`];
    if (!emails.length) {
      lines.push('Correo: —');
    } else if (emails.length === 1) {
      lines.push(`Correo: ${emails[0]}`);
    } else {
      lines.push('Correos:');
      for (const email of emails) {
        lines.push(`  • ${email}`);
      }
    }
    lines.push(`Teléfono: ${telefono || '—'}`);
    return lines.join('\n');
  }

  /** Una sola línea para PDF/Excel: días y etapa corta. */
  formatEdadMoraCompacta(r: {
    edad_mora_dias: number | null;
  }): string {
    const d = this.formatDiasMora(r.edad_mora_dias);
    const e = this.formatEtapaCobranzaCorta(r.edad_mora_dias);
    if (d === '—' && e === '—') return '—';
    return `${d} · ${e}`;
  }

  /**
   * Cobro y mora por **cuenta** (unidad).
   *
   * **Contrato con backend:** `edad_mora_dias` en GET de cuenta es la fuente principal.
   * El servidor la calcula en vivo: plazo día 30 del periodo, el 1 del mes siguiente = 30 días
   * (meses comerciales de 30), y la cuenta toma el MAX del historial. Sin historial, usa
   * inicio de cobro o el alta de la cuenta. Fallback local: máximo de `dias_en_mora` en caché
   * si el API aún no trae el agregado.
   *
   * `fecha_inicio_cobro`: API, primer movimiento, o alta de la cuenta (`created_at`).
   */
  getResumenMoraCobroParaCuenta(p: Cuenta): {
    edad_mora_dias: number | null;
    fecha_inicio_cobro: string | null;
    fecha_fin_cobro: string | null;
    fecha_alta: string | null;
  } {
    const historial = this.getHistorialByCuenta(p.id);
    const fechaAlta = this.fechaDiaDesdeIso(p.created_at);
    const fechaInicioExplicit =
      p.fecha_inicio_cobro?.trim() || this.fechaInicioCobroDesdeHistorial(historial) || null;
    const fechaInicioCobro = fechaInicioExplicit || fechaAlta;
    const fechaFinCobro =
      p.fecha_fin_cobro?.trim() || this.fechaFinCobroDesdeHistorial(historial);
    return {
      // Solo derivar días desde inicio explícito de cobro/mora (no desde el alta sola).
      edad_mora_dias: this.resolveEdadMoraDias(
        p,
        historial,
        fechaInicioExplicit,
        fechaFinCobro,
      ),
      fecha_inicio_cobro: fechaInicioCobro,
      fecha_fin_cobro: fechaFinCobro,
      fecha_alta: fechaAlta,
    };
  }

  /**
   * Edad en mora: campo API → máx. `dias_en_mora` del historial → días desde
   * inicio de cobro/mora hasta hoy (o fin de cobro si ya cerró).
   */
  private resolveEdadMoraDias(
    p: Cuenta,
    historial: HistorialPago[],
    fechaInicioCobro: string | null,
    fechaFinCobro: string | null,
  ): number | null {
    if (p.edad_mora_dias != null && Number.isFinite(Number(p.edad_mora_dias))) {
      return Math.max(0, Math.floor(Number(p.edad_mora_dias)));
    }
    const fromHist = this.maxDiasMoraFromHistorial(historial);
    if (fromHist != null) return fromHist;
    if (!fechaInicioCobro) return null;
    const start = fechaInicioCobro.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
    const endRaw = (fechaFinCobro?.slice(0, 10) || this.businessTodayYmd()).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) return null;
    return this.inclusiveCalendarDaysYmd(start, endRaw);
  }

  /** Hoy civil en zona de negocio (America/Bogota), YYYY-MM-DD. */
  private businessTodayYmd(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (!year || !month || !day) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return `${year}-${month}-${day}`;
  }

  /** Días de calendario inclusivos entre dos YYYY-MM-DD; si fin < inicio → 0. */
  private inclusiveCalendarDaysYmd(startYmd: string, endYmd: string): number {
    if (endYmd < startYmd) return 0;
    const [ys, ms, ds] = startYmd.split('-').map(Number);
    const [ye, me, de] = endYmd.split('-').map(Number);
    const start = Date.UTC(ys!, ms! - 1, ds!, 12, 0, 0);
    const end = Date.UTC(ye!, me! - 1, de!, 12, 0, 0);
    return Math.round((end - start) / 86_400_000) + 1;
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
   * Fecha inicio cobro (fallback): movimiento más antiguo registrado en historial.
   */
  private fechaInicioCobroDesdeHistorial(rows: HistorialPago[]): string | null {
    if (rows.length === 0) return null;
    const ordenado = rows
      .slice()
      .sort(
        (a, b) =>
          new Date((a.fecha_pago || a.created_at) ?? 0).getTime() -
          new Date((b.fecha_pago || b.created_at) ?? 0).getTime()
      );
    const inicio = ordenado[0];
    const fuente = (inicio?.fecha_pago || inicio?.created_at || '').trim();
    if (!fuente) return null;
    const ymdDirecto = fuente.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymdDirecto)) return ymdDirecto;
    return this.fechaDiaDesdeIso(fuente);
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

  /**
   * Fallback alineado con el backend: el agregado `edad_mora_dias` es el **máximo** de
   * `dias_en_mora` por movimiento (periodo más atrasado suele tener más días).
   */
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

  findClienteDuplicado(payload: { documento: string; email?: string }): Cliente | undefined {
    const docKey = this.normalizeDocumentoKey(payload.documento);
    const emailKey = payload.email?.trim().toLowerCase() ?? '';

    return this.clientesSignal().find((c) => {
      if (docKey && this.normalizeDocumentoKey(c.documento) === docKey) return true;
      if (emailKey && c.email?.trim().toLowerCase() === emailKey) return true;
      return false;
    });
  }

  getHistorialByClienteId(clienteId: string): HistorialPago[] {
    const propIds = new Set(
      this.cuentasSignal()
        .filter((p) => p.cliente_id === clienteId)
        .map((p) => p.id)
    );
    return Object.values(this.historialByCuentaSignal())
      .flat()
      .filter((h) => propIds.has(h.cuenta_id));
  }

  getCuentasByCliente(clienteId: string): Cuenta[] {
    return this.cuentasSignal().filter((p) => p.cliente_id === clienteId);
  }

  getCuentaById(id: string): Cuenta | undefined {
    return this.cuentasSignal().find((p) => p.id === id);
  }

  getHistorialByCuenta(cuentaId: string): HistorialPago[] {
    return this.historialByCuentaSignal()[cuentaId] ?? [];
  }

  /** True si ya se hizo GET de historial para esa unidad (aunque venga vacío). */
  hasHistorialLoaded(cuentaId: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.historialByCuentaSignal(), cuentaId);
  }

  async addHistorialPago(cuentaId: string, payload: AddHistorialPayload): Promise<HistorialPago> {
    const hadHistorialBefore = this.getHistorialByCuenta(cuentaId).length > 0;
    const record = await this.http.post<HistorialPago>(`/cuentas/${cuentaId}/historial`, payload);
    await this.ensureFechaInicioCobroOnPrimerRegistro(cuentaId, payload, hadHistorialBefore);
    await this.loadHistorialByCuenta(cuentaId);
    await this.loadCuenta(cuentaId);
    return record;
  }

  private async ensureFechaInicioCobroOnPrimerRegistro(
    cuentaId: string,
    payload: AddHistorialPayload,
    hadHistorialBefore: boolean
  ): Promise<void> {
    if (hadHistorialBefore) return;
    let cuenta = this.getCuentaById(cuentaId);
    if (!cuenta) {
      try {
        cuenta = await this.loadCuenta(cuentaId);
      } catch {
        return;
      }
    }
    if (cuenta.fecha_inicio_cobro?.trim()) return;
    const fechaInicio = payload.fecha_pago?.trim()?.slice(0, 10) || this.todayBogotaYmd();
    try {
      const updated = await this.http.patch<Cuenta>(`/cuentas/${cuentaId}`, {
        fecha_inicio_cobro: fechaInicio,
      });
      this.cuentasSignal.update((prev) => this.upsertById(prev, this.normalizeCuentaMonto(updated, cuenta)));
    } catch (err) {
      // Fallback: algunos backends no aceptan PATCH parcial.
      try {
        const fallbackPayload: UpdateCuentaPayload = {
          tipo_cuenta: cuenta.tipo_cuenta,
          identificador: cuenta.identificador,
          direccion: cuenta.direccion,
          notas: cuenta.notas ?? '',
          saldo_inicial: Number(cuenta.saldo_inicial ?? cuenta.monto_a_la_fecha ?? 0),
          cobro_nombre: cuenta.cobro_nombre,
          cobro_tipo_persona: cuenta.cobro_tipo_persona,
          cobro_documento: cuenta.cobro_documento,
          cobro_email: cuenta.cobro_email,
          deudores: cuenta.deudores,
          fecha_inicio_cobro: fechaInicio,
        };
        await this.updateCuenta(cuentaId, fallbackPayload);
      } catch {
        // No bloquea guardar historial si el backend no admite patch de inicio de cobro.
      }
    }
  }

  private todayBogotaYmd(): string {
    const date = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const month = parts.find((p) => p.type === 'month')?.value ?? '01';
    const day = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
  }

  async updateHistorialPago(
    cuentaId: string,
    historialId: string,
    payload: AddHistorialPayload,
  ): Promise<HistorialPago> {
    const path = `/cuentas/${cuentaId}/historial/${historialId}`;
    const record = await this.http.patch<HistorialPago>(path, payload);
    await this.loadHistorialByCuenta(cuentaId);
    await this.loadCuenta(cuentaId);
    return record;
  }

  async deleteHistorialPago(cuentaId: string, historialId: string): Promise<void> {
    const path = `/cuentas/${cuentaId}/historial/${historialId}`;
    await this.http.delete(path);
    await this.loadHistorialByCuenta(cuentaId);
    await this.loadCuenta(cuentaId);
  }

  /** Envía recordatorio de pago por correo (admin). El servidor valida deuda/email y envía el HTML del admin. */
  async sendPaymentReminderEmail(
    cuentaId: string,
    payload: {
      subject?: string;
      extra_recipients?: string[];
      body_html: string;
      body_text: string;
      attachments?: PaymentReminderEmailAttachmentPayload[];
    }
  ): Promise<PaymentReminderEmailRecord> {
    await this.ensureMontoServidorParaRecordatorio(cuentaId);
    const record = await this.http.post<PaymentReminderEmailRecord>('/payment-reminders/email/send', {
      cuenta_id: cuentaId,
      subject: payload.subject,
      extra_recipients: payload.extra_recipients?.length ? payload.extra_recipients : undefined,
      body_html: payload.body_html,
      body_text: payload.body_text,
      attachments: payload.attachments,
    });
    if (record.status === 'sent') {
      // La gestión la crea el backend; refrescamos el timeline sin fallar el envío si el GET falla.
      try {
        await this.loadGestionesByCuenta(cuentaId);
      } catch {
        /* ignore */
      }
    }
    return record;
  }

  /** Listado de recordatorios de la cuenta (sin cuerpos pesados en algunos backends). */
  async loadPaymentRemindersByCuenta(cuentaId: string): Promise<PaymentReminderEmailRecord[]> {
    const items = await this.http.getItems<PaymentReminderEmailRecord>(
      `/payment-reminders/cuentas/${cuentaId}/emails`
    );
    this.paymentRemindersByCuentaSignal.update((prev) => ({ ...prev, [cuentaId]: items }));
    return items;
  }

  getPaymentRemindersByCuenta(cuentaId: string): PaymentReminderEmailRecord[] {
    return (this.paymentRemindersByCuentaSignal()[cuentaId] ?? [])
      .slice()
      .sort((a, b) => {
        const ta = Date.parse(a.sent_at ?? a.created_at) || 0;
        const tb = Date.parse(b.sent_at ?? b.created_at) || 0;
        return tb - ta;
      });
  }

  /** Detalle del correo por id de gestión (`GET /payment-reminders/:gestionId`). */
  async getPaymentReminderById(gestionId: string): Promise<PaymentReminderEmailRecord> {
    return this.http.get<PaymentReminderEmailRecord>(`/payment-reminders/${gestionId}`);
  }

  /** Gestiones de correo (`tipo === 'email_reminder'`); solo lectura en UI. */
  isGestionEmailReminder(g: Pick<Gestion, 'tipo' | 'origen' | 'detalle' | 'email_reminder_id'>): boolean {
    if (g.tipo === 'email_reminder') return true;
    if (g.tipo === 'manual') return false;
    // Legacy
    if (g.origen === 'email_reminder') return true;
    return !!this.getGestionEmailReminderId(g);
  }

  getGestionEstado(g: Pick<Gestion, 'detalle' | 'estado'>): string {
    return String(g.detalle?.estado ?? g.estado ?? '').trim();
  }

  formatGestionEstadoLabel(g: Pick<Gestion, 'detalle' | 'estado'>): string {
    const estado = this.getGestionEstado(g);
    return this.estadoGestionLabels[estado] || estado || '—';
  }

  formatGestionTipo(g: Pick<Gestion, 'tipo' | 'origen' | 'detalle' | 'email_reminder_id'>): string {
    return this.isGestionEmailReminder(g) ? 'Correo' : 'Manual';
  }

  /**
   * Resumen en timeline: si `descripcion` es JSON con `summary`, usa ese campo;
   * si es manual (texto plano), se muestra tal cual.
   */
  getGestionDescripcion(g: Pick<Gestion, 'detalle' | 'descripcion' | 'tipo'>): string {
    const raw = String(g.detalle?.descripcion ?? g.descripcion ?? '').trim();
    if (!raw) return '';
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw) as { summary?: unknown };
        if (typeof parsed?.summary === 'string' && parsed.summary.trim()) {
          return parsed.summary.trim();
        }
      } catch {
        /* texto plano */
      }
    }
    return raw;
  }

  /**
   * @deprecated El detalle del correo se abre con `gestion.id`
   * (`GET /payment-reminders/:gestionId`), no con un id de tabla de correo.
   */
  getGestionEmailReminderId(
    g: Pick<Gestion, 'detalle' | 'email_reminder_id'>
  ): string | null {
    const id = g.detalle?.email_reminder_id ?? g.email_reminder_id;
    const trimmed = String(id ?? '').trim();
    return trimmed || null;
  }

  /**
   * Alinea `monto_a_la_fecha` en el servidor cuando la UI muestra deuda pero el campo en BD quedó en 0
   * (p. ej. saldo inicial solo en localStorage, sin movimientos de historial).
   */
  private async ensureMontoServidorParaRecordatorio(cuentaId: string): Promise<void> {
    let cuenta = this.getCuentaById(cuentaId);
    if (!cuenta) {
      cuenta = await this.loadCuenta(cuentaId);
    } else {
      await this.loadCuenta(cuentaId);
      cuenta = this.getCuentaById(cuentaId) ?? cuenta;
    }

    const deudaUi = this.getDeudaActualParaCuenta(cuenta);
    if (deudaUi <= 0) return;

    const montoServidor = Number(cuenta.monto_a_la_fecha);
    if (montoServidor > 0) return;

    const historial = this.getHistorialByCuenta(cuentaId);
    if (historial.length > 0) return;

    await this.updateCuenta(cuentaId, {
      tipo_cuenta: cuenta.tipo_cuenta,
      identificador: cuenta.identificador,
      direccion: cuenta.direccion,
      notas: cuenta.notas,
      saldo_inicial: deudaUi,
      cobro_nombre: cuenta.cobro_nombre,
      cobro_tipo_persona: cuenta.cobro_tipo_persona,
      cobro_documento: cuenta.cobro_documento,
      cobro_email: cuenta.cobro_email,
      deudores: cuenta.deudores,
    });
  }

  async addGestion(cuentaId: string, payload: UpdateGestionPayload): Promise<Gestion> {
    const gestion = await this.http.post<Gestion>(`/cuentas/${cuentaId}/gestiones`, payload);
    await this.loadGestionesByCuenta(cuentaId);
    return this.normalizeGestion(gestion, cuentaId);
  }

  async updateGestion(
    cuentaId: string,
    gestionId: string,
    payload: UpdateGestionPayload
  ): Promise<Gestion> {
    const gestion = await this.http.patch<Gestion>(
      `/cuentas/${cuentaId}/gestiones/${gestionId}`,
      payload
    );
    await this.loadGestionesByCuenta(cuentaId);
    return this.normalizeGestion(gestion, cuentaId);
  }

  async deleteGestion(cuentaId: string, gestionId: string): Promise<void> {
    await this.http.delete(`/cuentas/${cuentaId}/gestiones/${gestionId}`);
    await this.loadGestionesByCuenta(cuentaId);
  }

  getProcesosLegalesByCliente(clienteId: string): ProcesoLegal[] {
    return this.procesosLegalesSignal().filter((c) => c.cliente_id === clienteId);
  }

  getGestionesByCuenta(cuentaId: string): Gestion[] {
    return (this.gestionesByCuentaSignal()[cuentaId] ?? [])
      .slice()
      .sort((a, b) => this.gestionSortTime(b) - this.gestionSortTime(a));
  }

  /**
   * Timestamp para ordenar timeline: más reciente primero.
   * Con fecha solo-día usa el día elegido (no created_at), para que una trazabilidad
   * con fecha antigua no aparezca como la más nueva al registrarla hoy.
   */
  private gestionSortTime(g: Pick<Gestion, 'fecha' | 'created_at'>): number {
    const fechaRaw = String(g.fecha ?? '').trim();
    const createdRaw = String(g.created_at ?? '').trim();
    const ymd = fechaRaw.slice(0, 10);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(ymd);
    const hasExplicitTime = fechaRaw.includes('T') && !/T00:00:00(\.000)?Z?$/.test(fechaRaw);

    if (dateOnly && !hasExplicitTime) {
      const base = Date.parse(`${ymd}T12:00:00`);
      if (!Number.isFinite(base)) return 0;
      const created = Date.parse(createdRaw);
      // Desempate estable el mismo día: hora de creación (ms dentro del día).
      const tie = Number.isFinite(created) ? created % 86_400_000 : 0;
      return base + tie;
    }

    const parsed = Date.parse(fechaRaw || createdRaw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getEstadoCuentaFilesByCuenta(cuentaId: string): EstadoCuentaFile[] {
    return (this.estadoCuentaFilesByCuentaSignal()[cuentaId] ?? [])
      .slice()
      .sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());
  }

  calcularMontoALaFecha(cuentaId: string): number {
    const cuenta = this.getCuentaById(cuentaId);
    if (cuenta) return this.getDeudaActualParaCuenta(cuenta);

    const historial = this.getHistorialByCuenta(cuentaId);
    const totalCobrado = historial.reduce((sum, h) => sum + h.valor_cobrado, 0);
    const totalPagado = historial.reduce((sum, h) => sum + h.valor_pagado, 0);
    return Math.max(0, totalCobrado - totalPagado);
  }

  getTotalCartera(): number {
    // Agregado del backend: evita sumar deuda con N+1 de historiales en listados.
    return this.metricsDashboardSignal().total_cartera;
  }

  /**
   * Honorarios de una cuenta: misma regla que detalle de cliente / recordatorio
   * (override manual, % por radicado, o fallback por edad en mora).
   */
  getHonorariosParaCuenta(p: Cuenta): HonorariosResultado {
    const procesos = this.getProcesosLegalesByCliente(p.cliente_id);
    const proceso = resolverProcesoParaCuenta(p.id, procesos);
    const resumen = this.getResumenMoraCobroParaCuenta(p);
    return calcularHonorarios({
      deuda: this.getDeudaActualParaCuenta(p),
      tipo: proceso?.tipo,
      etapa: proceso?.etapa_proceso,
      overrideMonto: p.honorarios_monto,
      edadMoraDias: resumen.edad_mora_dias,
    });
  }

  /** Suma de honorarios (sugeridos o manuales) de todas las propiedades del sistema. */
  getTotalHonorarios(): number {
    return this.sumHonorariosCentavos(this.cuentasSignal()) / 100;
  }

  /** Total de honorarios de un subconjunto de cuentas (p. ej. un cliente). */
  getTotalHonorariosParaCuentas(cuentas: readonly Cuenta[]): number {
    return this.sumHonorariosCentavos(cuentas) / 100;
  }

  /**
   * Honorarios agregados por cliente (solo filas con monto &gt; 0),
   * ordenados de mayor a menor.
   */
  getHonorariosPorCliente(): {
    cliente_id: string;
    nombre: string;
    honorarios: number;
    deuda: number;
    porcentaje_del_total: number;
  }[] {
    const total = this.getTotalHonorarios();
    const rows = this.clientesSignal().map((c) => {
      const props = this.cuentasSignal().filter((p) => p.cliente_id === c.id);
      const honorarios = this.getTotalHonorariosParaCuentas(props);
      const deuda = props.reduce((sum, p) => sum + this.getDeudaActualParaCuenta(p), 0);
      return {
        cliente_id: c.id,
        nombre: c.nombre?.trim() || 'Sin nombre',
        honorarios,
        deuda,
        porcentaje_del_total:
          total > 0 ? Math.round((honorarios / total) * 1000) / 10 : 0,
      };
    });
    return rows
      .filter((r) => r.honorarios > 0)
      .sort((a, b) => {
        if (b.honorarios !== a.honorarios) return b.honorarios - a.honorarios;
        return a.nombre.localeCompare(b.nombre, 'es');
      });
  }

  private sumHonorariosCentavos(cuentas: readonly Cuenta[]): number {
    return cuentas.reduce((sum, p) => {
      const monto = this.getHonorariosParaCuenta(p).monto;
      if (monto == null || !Number.isFinite(monto)) return sum;
      return sum + Math.round(monto * 100);
    }, 0);
  }

  getClientesActivos(): number {
    return this.metricsDashboardSignal().clientes_activos;
  }

  getCuentasActivas(): number {
    return this.metricsDashboardSignal().cuentas_activas;
  }

  getProcesosLegalesActivos(): number {
    return this.metricsDashboardSignal().procesos_legales_activos;
  }

  getDistribucionEstados(): Record<string, number> {
    return this.distribucionEstadosSignal();
  }

  getEvolucionCartera(): { periodo: string; total: number }[] {
    return this.evolucionSignal();
  }

  getMoraPorCliente(): MoraPorClienteRow[] {
    return buildMoraPorCliente({
      clientes: this.clientesSignal(),
      cuentas: this.cuentasSignal(),
      deudaDe: (p) => this.getDeudaActualParaCuenta(p),
      edadMoraDe: (p) => this.getResumenMoraCobroParaCuenta(p).edad_mora_dias,
    });
  }

  get mockClientes(): Cliente[] {
    return this.clientesSignal();
  }

  get mockCuentas(): Cuenta[] {
    return this.cuentasSignal();
  }

  get mockHistorial(): HistorialPago[] {
    return Object.values(this.historialByCuentaSignal()).flat();
  }

  get mockProcesosLegales(): ProcesoLegal[] {
    return this.procesosLegalesSignal();
  }

  get mockGestiones(): Gestion[] {
    return Object.values(this.gestionesByCuentaSignal()).flat();
  }

  async loadDashboardData(): Promise<void> {
    await Promise.all([
      this.loadMetricsDashboard(),
      this.loadDistribucionEstados(),
      this.loadClientes(),
      this.loadCuentas(),
    ]);
    // Sin N+1 completo de historial: cartera vía metrics; mora vía campo API + fallback selectivo.
    await Promise.all([
      this.loadProcesosLegalesForLoadedClientes(),
      this.loadHistorialesMissingEdadMora(this.cuentasSignal()),
    ]);
  }

  async loadGraficosData(_months = 12): Promise<void> {
    await Promise.all([
      this.loadMetricsDashboard(),
      this.loadDistribucionEstados(),
      this.loadClientes(),
      this.loadCuentas(),
    ]);
    await Promise.all([
      this.loadProcesosLegalesForLoadedClientes(),
      this.loadHistorialesMissingEdadMora(this.cuentasSignal()),
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

  async updateCliente(clienteId: string, payload: UpdateClientePayload): Promise<Cliente> {
    const cliente = await this.http.patch<Cliente>(`/clientes/${clienteId}`, payload);
    this.clientesSignal.update((prev) => this.upsertById(prev, cliente));
    return cliente;
  }

  /** Reenvía el correo de bienvenida / invitación al portal (mismo mailer del alta). */
  async resendClienteInvitation(clienteId: string): Promise<Cliente> {
    const cliente = await this.http.post<Cliente>(`/clientes/${clienteId}/resend-invitation`, {});
    this.clientesSignal.update((prev) => this.upsertById(prev, cliente));
    return cliente;
  }

  async createCuenta(payload: CreateCuentaPayload): Promise<Cuenta> {
    // El backend calcula automáticamente el saldo/monto_a_la_fecha al crear la cuenta.
    const cuenta = await this.http.post<Cuenta>('/cuentas', payload);
    this.writeSaldoInicialFijo(cuenta.id, payload.saldo_inicial);
    const withPayloadDeudores: Cuenta = {
      ...cuenta,
      saldo_inicial: cuenta.saldo_inicial ?? payload.saldo_inicial,
      deudores: mergeDeudoresAfterWrite(cuenta.deudores, payload.deudores),
      cobro_nombre: cuenta.cobro_nombre || payload.cobro_nombre,
      cobro_tipo_persona: cuenta.cobro_tipo_persona || payload.cobro_tipo_persona,
      cobro_documento: cuenta.cobro_documento || payload.cobro_documento,
      cobro_email: cuenta.cobro_email || payload.cobro_email,
    };
    const normalizedCuenta = this.normalizeCuentaMonto(
      withPayloadDeudores,
      { ...withPayloadDeudores, saldo_inicial: payload.saldo_inicial, monto_a_la_fecha: payload.saldo_inicial }
    );
    this.cuentasSignal.update((prev) => this.upsertById(prev, normalizedCuenta));
    await this.loadCuentasByCliente(payload.cliente_id);
    return normalizedCuenta;
  }

  async updateCuenta(cuentaId: string, payload: UpdateCuentaPayload): Promise<Cuenta> {
    const cuenta = await this.http.patch<Cuenta>(`/cuentas/${cuentaId}`, payload);
    const prevCuenta = this.getCuentaById(cuentaId);
    const nuevoSaldo =
      payload.saldo_inicial != null && Number.isFinite(Number(payload.saldo_inicial))
        ? Math.max(0, Number(payload.saldo_inicial))
        : null;
    if (nuevoSaldo != null) {
      this.writeSaldoInicialFijo(cuentaId, nuevoSaldo);
    }
    // Si el PATCH trae saldo_inicial, debe ganar sobre el valor previo en memoria
    // (normalizeCuentaMonto prioriza lock/prev sobre el payload del servidor).
    const propiedadConSaldo: Cuenta = {
      ...(nuevoSaldo != null ? { ...cuenta, saldo_inicial: nuevoSaldo } : cuenta),
      deudores: mergeDeudoresAfterWrite(cuenta.deudores, payload.deudores, prevCuenta?.deudores),
      ...(payload.honorarios_monto !== undefined
        ? { honorarios_monto: payload.honorarios_monto }
        : {}),
    };
    const prevConSaldo =
      nuevoSaldo != null && prevCuenta
        ? { ...prevCuenta, saldo_inicial: nuevoSaldo }
        : prevCuenta;
    const normalizedCuenta = this.normalizeCuentaMonto(propiedadConSaldo, prevConSaldo);
    this.cuentasSignal.update((prev) => this.upsertById(prev, normalizedCuenta));
    await this.loadCuentasByCliente(cuenta.cliente_id);
    return this.getCuentaById(cuentaId) ?? normalizedCuenta;
  }

  async deleteCuenta(cuentaId: string, clienteId: string): Promise<void> {
    await this.http.delete(`/cuentas/${cuentaId}`);
    this.cuentasSignal.update((prev) => prev.filter((p) => p.id !== cuentaId));
    this.historialByCuentaSignal.update((prev) => {
      const { [cuentaId]: _removed, ...rest } = prev;
      return rest;
    });
    this.gestionesByCuentaSignal.update((prev) => {
      const { [cuentaId]: _removed, ...rest } = prev;
      return rest;
    });
    this.paymentRemindersByCuentaSignal.update((prev) => {
      const { [cuentaId]: _removed, ...rest } = prev;
      return rest;
    });
    this.estadoCuentaFilesByCuentaSignal.update((prev) => {
      const { [cuentaId]: _removed, ...rest } = prev;
      return rest;
    });
    this.clearSaldoInicialFijo(cuentaId);
    try {
      await this.loadCuentasByCliente(clienteId);
    } catch {
      // El borrado ya se aplicó en servidor y en el listado local.
    }
  }

  async loadCuentas(clienteId?: string): Promise<Cuenta[]> {
    const params = clienteId ? new HttpParams().set('cliente_id', clienteId) : undefined;
    const items = await this.http.getItems<Cuenta>('/cuentas', { params });
    const normalizedItems = this.normalizeCuentasList(items);
    if (clienteId) {
      this.cuentasSignal.update((prev) => {
        const others = prev.filter((p) => p.cliente_id !== clienteId);
        return [...others, ...normalizedItems];
      });
    } else {
      this.cuentasSignal.set(normalizedItems);
    }
    return normalizedItems;
  }

  async loadCuenta(id: string): Promise<Cuenta> {
    const cuenta = await this.http.get<Cuenta>(`/cuentas/${id}`);
    const prevCuenta = this.getCuentaById(id);
    const normalizedCuenta = this.normalizeCuentaMonto(cuenta, prevCuenta);
    this.cuentasSignal.update((prev) => this.upsertById(prev, normalizedCuenta));
    return normalizedCuenta;
  }

  async loadCuentaDetallesForCuentas(propiedades: Pick<Cuenta, 'id'>[]): Promise<Cuenta[]> {
    return Promise.all(propiedades.map((p) => this.loadCuenta(p.id)));
  }

  async loadCuentasByCliente(clienteId: string): Promise<Cuenta[]> {
    const items = await this.http.getItems<Cuenta>(`/clientes/${clienteId}/cuentas`);
    const normalizedItems = this.normalizeCuentasList(items);
    this.cuentasSignal.update((prev) => {
      const others = prev.filter((p) => p.cliente_id !== clienteId);
      return [...others, ...normalizedItems];
    });
    return normalizedItems;
  }

  async loadProcesosLegalesByCliente(clienteId: string): Promise<ProcesoLegal[]> {
    const items = await this.http.getItems<ProcesoLegal>(`/clientes/${clienteId}/procesos-legales`);
    this.procesosLegalesSignal.update((prev) => {
      const others = prev.filter((c) => c.cliente_id !== clienteId);
      return [...others, ...items];
    });
    return items;
  }

  /** Una sola petición con todos los procesos legales (staff). */
  async loadAllProcesosLegales(): Promise<ProcesoLegal[]> {
    const items = await this.http.getItems<ProcesoLegal>('/procesos-legales');
    this.procesosLegalesSignal.set(items);
    return items;
  }

  async createProcesoLegal(payload: CreateProcesoLegalPayload): Promise<ProcesoLegal> {
    const body: Record<string, unknown> = {
      cliente_id: payload.cliente_id,
      cuenta_id: payload.cuenta_id,
      numero_cuenta: payload.numero_cuenta,
      tipo: payload.tipo,
      estado: payload.estado,
      etapa_proceso: payload.etapa_proceso,
    };
    const cuenta = await this.http.post<ProcesoLegal>('/procesos-legales', body);
    await this.loadProcesosLegalesByCliente(payload.cliente_id);
    await this.loadMetricsDashboard();
    return cuenta;
  }

  async updateProcesoLegalEstado(procesoLegalId: string, payload: UpdateProcesoLegalEstadoPayload): Promise<ProcesoLegal> {
    const cuenta = await this.http.patch<ProcesoLegal>(`/procesos-legales/${procesoLegalId}`, payload);
    this.procesosLegalesSignal.update((prev) => this.upsertById(prev, cuenta));
    await this.loadMetricsDashboard();
    return cuenta;
  }

  async updateProcesoLegal(procesoLegalId: string, payload: UpdateProcesoLegalPayload): Promise<ProcesoLegal> {
    const body: Record<string, unknown> = {
      numero_cuenta: payload.numero_cuenta,
      tipo: payload.tipo,
      estado: payload.estado,
      etapa_proceso: payload.etapa_proceso,
      cuenta_id: payload.cuenta_id ?? null,
    };
    const clienteId = this.procesosLegalesSignal().find((c) => c.id === procesoLegalId)?.cliente_id;
    const patched = await this.http.patch<ProcesoLegal>(`/procesos-legales/${procesoLegalId}`, body);
    if (clienteId) {
      await this.loadProcesosLegalesByCliente(clienteId);
    } else {
      this.procesosLegalesSignal.update((prev) => this.upsertById(prev, patched));
    }
    await this.loadMetricsDashboard();
    if (clienteId) {
      const refreshed = this.getProcesosLegalesByCliente(clienteId).find((c) => c.id === procesoLegalId);
      if (refreshed) return refreshed;
    }
    return patched;
  }

  async deleteProcesoLegal(procesoLegalId: string, clienteId: string): Promise<void> {
    await this.http.delete(`/procesos-legales/${procesoLegalId}`);
    await this.loadProcesosLegalesByCliente(clienteId);
    await this.loadMetricsDashboard();
  }

  async loadHistorialByCuenta(cuentaId: string): Promise<HistorialPago[]> {
    const items = await this.http.getItems<HistorialPago>(`/cuentas/${cuentaId}/historial`);
    this.historialByCuentaSignal.update((prev) => ({ ...prev, [cuentaId]: items }));
    return items;
  }

  async loadHistorialesForCuentas(propiedades: Pick<Cuenta, 'id'>[]): Promise<void> {
    await Promise.all(propiedades.map((p) => this.loadHistorialByCuenta(p.id)));
  }

  /**
   * Carga historial solo de unidades sin `edad_mora_dias` en el API,
   * para poder calcular el fallback local sin N+1 completo.
   */
  async loadHistorialesMissingEdadMora(propiedades: Cuenta[]): Promise<void> {
    const missing = propiedades.filter(
      (p) => p.edad_mora_dias == null || !Number.isFinite(Number(p.edad_mora_dias)),
    );
    if (missing.length === 0) return;
    await this.loadHistorialesForCuentas(missing);
  }

  async loadGestionesForCuentas(propiedades: Pick<Cuenta, 'id'>[]): Promise<void> {
    if (propiedades.length === 0) return;
    // Listados: 1 GET /gestiones. Detalle de una unidad: GET por cuenta.
    if (propiedades.length === 1) {
      await this.loadGestionesByCuenta(propiedades[0]!.id);
      return;
    }
    await this.loadAllGestiones();
  }

  /** Una sola petición con todas las gestiones (staff). */
  async loadAllGestiones(): Promise<void> {
    const items = await this.http.getItems<Gestion>('/gestiones');
    const byCuenta: Record<string, Gestion[]> = {};
    for (const raw of items) {
      const normalized = this.normalizeGestion(raw, raw.cuenta_id);
      const cuentaId = normalized.cuenta_id;
      const list = byCuenta[cuentaId];
      if (list) list.push(normalized);
      else byCuenta[cuentaId] = [normalized];
    }
    this.gestionesByCuentaSignal.set(byCuenta);
  }

  async loadGestionesByCuenta(cuentaId: string): Promise<Gestion[]> {
    const items = await this.http.getItems<Gestion>(`/cuentas/${cuentaId}/gestiones`);
    const normalized = items.map((g) => this.normalizeGestion(g, cuentaId));
    this.gestionesByCuentaSignal.update((prev) => ({ ...prev, [cuentaId]: normalized }));
    return normalized;
  }

  /**
   * Unifica contrato nuevo (`tipo` + `detalle`) y legacy (campos planos / `origen`).
   * El cuerpo HTML del correo no viene en gestiones: se abre con `GET /payment-reminders/:gestionId`.
   */
  private normalizeGestion(raw: Gestion, cuentaIdFallback?: string): Gestion {
    const detalleRaw = raw.detalle;
    const emailReminderId =
      detalleRaw?.email_reminder_id ?? raw.email_reminder_id ?? null;
    const estado = String(detalleRaw?.estado ?? raw.estado ?? '').trim();
    const descripcion = String(detalleRaw?.descripcion ?? raw.descripcion ?? '').trim();
    const detalle = {
      estado,
      descripcion,
      ...(emailReminderId != null && String(emailReminderId).trim() !== ''
        ? { email_reminder_id: String(emailReminderId).trim() }
        : { email_reminder_id: emailReminderId }),
    };
    let tipo = raw.tipo;
    if (!tipo) {
      if (raw.origen === 'email_reminder' || detalle.email_reminder_id) {
        tipo = 'email_reminder';
      } else {
        tipo = 'manual';
      }
    }
    return {
      ...raw,
      cuenta_id: raw.cuenta_id || cuentaIdFallback || '',
      tipo,
      detalle,
      estado,
      descripcion,
      email_reminder_id: detalle.email_reminder_id ?? null,
    };
  }

  async loadEstadoCuentaFilesByCuenta(cuentaId: string): Promise<EstadoCuentaFile[]> {
    const items = this.readEstadoCuentaFilesFromStorage(cuentaId);
    this.estadoCuentaFilesByCuentaSignal.update((prev) => ({ ...prev, [cuentaId]: items }));
    return items;
  }

  async uploadEstadoCuentaFileMock(
    cuentaId: string,
    payload: { file: File; notas?: string }
  ): Promise<EstadoCuentaFile> {
    const next: EstadoCuentaFile = {
      id: this.createMockFileId(),
      cuenta_id: cuentaId,
      nombre: payload.file.name,
      tamano_bytes: payload.file.size,
      mime_type: payload.file.type || 'application/octet-stream',
      fecha_subida: new Date().toISOString(),
      notas: payload.notas?.trim() || undefined,
    };
    const current = this.readEstadoCuentaFilesFromStorage(cuentaId);
    const updated = [next, ...current];
    this.writeEstadoCuentaFilesToStorage(cuentaId, updated);
    this.estadoCuentaFilesByCuentaSignal.update((prev) => ({ ...prev, [cuentaId]: updated }));
    return next;
  }

  async deleteEstadoCuentaFileMock(cuentaId: string, fileId: string): Promise<void> {
    const current = this.readEstadoCuentaFilesFromStorage(cuentaId);
    const updated = current.filter((f) => f.id !== fileId);
    this.writeEstadoCuentaFilesToStorage(cuentaId, updated);
    this.estadoCuentaFilesByCuentaSignal.update((prev) => ({ ...prev, [cuentaId]: updated }));
  }

  async loadMetricsDashboard(): Promise<void> {
    const metrics = await this.http.get<{
      total_cartera: number;
      clientes_activos: number;
      cuentas_activas?: number;
      procesos_legales_activos?: number;
    }>('/metrics/dashboard');
    this.metricsDashboardSignal.set({
      total_cartera: metrics.total_cartera ?? 0,
      clientes_activos: metrics.clientes_activos ?? 0,
      cuentas_activas: metrics.cuentas_activas ?? 0,
      procesos_legales_activos: metrics.procesos_legales_activos ?? 0,
    });
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

  private async loadProcesosLegalesForLoadedClientes(): Promise<void> {
    await this.loadAllProcesosLegales();
  }

  private upsertById<T extends { id: string }>(items: T[], value: T): T[] {
    const idx = items.findIndex((it) => it.id === value.id);
    if (idx === -1) return [...items, value];
    const copy = items.slice();
    copy[idx] = value;
    return copy;
  }

  /**
   * Saldo inicial preservado (lock / API). No se resta Σ valor_cobrado.
   * Un lock en 0 (migración defectuosa) no tapa un saldo_inicial real del API.
   * Las reparaciones de montos inflados solo corren si no hay lock positivo confiable.
   */
  private resolveSaldoInicialPreservado(p: Cuenta): number {
    const restored = this.restoreSaldoInicialIfReducedByObsoleteMigration(p);
    if (restored != null) return restored;

    const lockedInicial = this.readSaldoInicialFijo(p.id);
    // Lock positivo = valor preservado (edición del usuario o carga previa correcta).
    if (lockedInicial != null && lockedInicial > 0) {
      return lockedInicial;
    }

    const apiInicial =
      p.saldo_inicial != null && Number.isFinite(Number(p.saldo_inicial))
        ? Math.max(0, Number(p.saldo_inicial))
        : null;

    const montoBackend = Number.isFinite(Number(p.monto_a_la_fecha))
      ? Math.max(0, Number(p.monto_a_la_fecha))
      : 0;
    const historial = this.getHistorialByCuenta(p.id);
    const totalPagado = historial.reduce(
      (sum, h) => sum + this.toMoneyNumber(h.valor_pagado),
      0,
    );

    if (apiInicial != null) {
      const safeInicial = apiInicial;
      // Reparacion: el inicial quedo igual al monto inflado (deuda real + pagos).
      if (totalPagado > 0 && montoBackend > 0 && safeInicial - montoBackend === totalPagado) {
        this.writeSaldoInicialFijo(p.id, montoBackend);
        return montoBackend;
      }
      const montoInfladoEnHistorial = historial.some(
        (h) => this.toMoneyNumber(h.monto_a_la_fecha) === montoBackend,
      );
      if (
        totalPagado > 0 &&
        montoBackend > 0 &&
        safeInicial === montoBackend &&
        montoInfladoEnHistorial
      ) {
        const repairedInicial = Math.max(0, montoBackend - totalPagado);
        this.writeSaldoInicialFijo(p.id, repairedInicial);
        return repairedInicial;
      }
      this.writeSaldoInicialFijo(p.id, safeInicial);
      return safeInicial;
    }

    const fallbackInicial = Math.max(0, montoBackend - totalPagado);
    this.writeSaldoInicialFijo(p.id, fallbackInicial);
    return fallbackInicial;
  }

  /**
   * Recupera saldo inicial si el lock local quedó en 0 o reducido por la migración
   * que restaba cobros, y el API aún trae el valor real.
   */
  private restoreSaldoInicialIfReducedByObsoleteMigration(p: Cuenta): number | null {
    const storage = this.getLocalStorage();
    const v2Key = `legal.cobradoModel.v2.${p.id}`;
    const hadV2 = storage?.getItem(v2Key) === '1';
    if (storage && hadV2) storage.removeItem(v2Key);

    const locked = this.readSaldoInicialFijo(p.id);
    const apiInicial = Number(p.saldo_inicial);
    const apiPositive =
      p.saldo_inicial != null && Number.isFinite(apiInicial) && Math.max(0, apiInicial) > 0
        ? Math.max(0, apiInicial)
        : null;

    // Lock 0 siempre cede ante un saldo_inicial real del API.
    if (locked === 0 && apiPositive != null) {
      this.writeSaldoInicialFijo(p.id, apiPositive);
      return apiPositive;
    }

    // Migración v2: el lock quedó por debajo del API.
    if (hadV2 && locked != null && apiPositive != null && apiPositive > locked) {
      this.writeSaldoInicialFijo(p.id, apiPositive);
      return apiPositive;
    }

    if (locked === 0 && apiPositive == null) {
      this.clearSaldoInicialFijo(p.id);
    }
    return null;
  }

  private clearSaldoInicialFijo(cuentaId: string): void {
    const storage = this.getLocalStorage();
    if (!storage) return;
    storage.removeItem(this.saldoInicialStorageKey(cuentaId));
    storage.removeItem(`legal.cobradoModel.v2.${cuentaId}`);
  }

  private compareHistorialParaSaldo(a: HistorialPago, b: HistorialPago): number {
    const byDate = this.historialBalanceDate(a) - this.historialBalanceDate(b);
    if (byDate !== 0) return byDate;

    const byCreated = Date.parse(a.created_at || '') - Date.parse(b.created_at || '');
    if (Number.isFinite(byCreated) && byCreated !== 0) return byCreated;

    return a.id.localeCompare(b.id);
  }

  private historialBalanceDate(h: HistorialPago): number {
    const fechaPago = Date.parse((h.fecha_pago || '').slice(0, 10));
    if (Number.isFinite(fechaPago)) return fechaPago;

    const periodo = /^\d{4}-\d{2}$/.test(h.periodo) ? Date.parse(`${h.periodo}-01`) : Number.NaN;
    if (Number.isFinite(periodo)) return periodo;

    const created = Date.parse(h.created_at || '');
    return Number.isFinite(created) ? created : 0;
  }

  private toMoneyNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private normalizeCuentasList(items: Cuenta[]): Cuenta[] {
    const prevById = new Map(this.cuentasSignal().map((p) => [p.id, p]));
    return items.map((p) => this.normalizeCuentaMonto(p, prevById.get(p.id)));
  }

  private normalizeCuentaMonto(cuenta: Cuenta, prev?: Cuenta): Cuenta {
    const withDeudores = normalizeCuentaDeudores({
      ...cuenta,
      // Si el API omite deudores o solo espeja cobro_* (1 item), conserva la lista local más completa.
      deudores: mergeDeudoresPreferringComplete(cuenta.deudores, prev?.deudores),
    });
    const monto = Number(withDeudores.monto_a_la_fecha);
    const apiSaldo =
      withDeudores.saldo_inicial != null && Number.isFinite(Number(withDeudores.saldo_inicial))
        ? Math.max(0, Number(withDeudores.saldo_inicial))
        : null;
    const prevSaldo =
      prev?.saldo_inicial != null && Number.isFinite(Number(prev.saldo_inicial))
        ? Math.max(0, Number(prev.saldo_inicial))
        : null;
    const restored = this.restoreSaldoInicialIfReducedByObsoleteMigration(withDeudores);
    const lockedInicial = restored ?? this.readSaldoInicialFijo(withDeudores.id);

    // Preferir valores positivos: lock>0, luego API, luego prev. Lock 0 no tapa el API.
    let normalizedSaldoInicial: number | null = null;
    if (lockedInicial != null && lockedInicial > 0) {
      normalizedSaldoInicial = lockedInicial;
    } else if (apiSaldo != null && apiSaldo > 0) {
      normalizedSaldoInicial = apiSaldo;
    } else if (prevSaldo != null && prevSaldo > 0) {
      normalizedSaldoInicial = prevSaldo;
    } else if (apiSaldo != null) {
      normalizedSaldoInicial = apiSaldo;
    } else if (prevSaldo != null) {
      normalizedSaldoInicial = prevSaldo;
    } else if (lockedInicial != null) {
      normalizedSaldoInicial = lockedInicial;
    }

    if (normalizedSaldoInicial != null) this.writeSaldoInicialFijo(withDeudores.id, normalizedSaldoInicial);
    const fechas = {
      fecha_inicio_cobro: this.normalizeFechaYmd(withDeudores.fecha_inicio_cobro) ?? prev?.fecha_inicio_cobro ?? null,
      fecha_fin_cobro: this.normalizeFechaYmd(withDeudores.fecha_fin_cobro) ?? prev?.fecha_fin_cobro ?? null,
    };
    // Prisma Decimal llega como string en JSON; sin coerce el override manual se ignora.
    const rawHonorarios =
      withDeudores.honorarios_monto !== undefined
        ? withDeudores.honorarios_monto
        : (prev?.honorarios_monto ?? null);
    const honorarios_monto =
      rawHonorarios == null || rawHonorarios === ('' as unknown)
        ? null
        : Number.isFinite(Number(rawHonorarios))
          ? Math.max(0, Number(rawHonorarios))
          : null;
    if (Number.isFinite(monto)) {
      return {
        ...withDeudores,
        ...fechas,
        honorarios_monto,
        saldo_inicial: normalizedSaldoInicial,
        monto_a_la_fecha: Math.max(0, monto),
      };
    }
    return {
      ...withDeudores,
      ...fechas,
      honorarios_monto,
      saldo_inicial: normalizedSaldoInicial,
      // Si el detalle no trae monto válido, preservamos el último valor conocido (saldo inicial/monto cargado).
      monto_a_la_fecha: Math.max(0, Number(prev?.monto_a_la_fecha ?? 0)),
    };
  }

  /** Normaliza fechas del API (ISO o YYYY-MM-DD) a YYYY-MM-DD. */
  private normalizeFechaYmd(value: unknown): string | null {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const ymd = raw.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
  }

  private estadoCuentaStorageKey(cuentaId: string): string {
    return `legal.estadoCuentaFiles.${cuentaId}`;
  }

  private saldoInicialStorageKey(cuentaId: string): string {
    return `legal.saldoInicial.${cuentaId}`;
  }

  private readSaldoInicialFijo(cuentaId: string): number | null {
    const storage = this.getLocalStorage();
    if (!storage) return null;
    const raw = storage.getItem(this.saldoInicialStorageKey(cuentaId));
    if (raw == null || raw.trim() === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, value) : null;
  }

  private writeSaldoInicialFijo(cuentaId: string, value: number): void {
    const storage = this.getLocalStorage();
    if (!storage) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    storage.setItem(this.saldoInicialStorageKey(cuentaId), String(Math.max(0, numeric)));
  }

  private getLocalStorage(): Storage | null {
    if (typeof globalThis.localStorage === 'undefined') return null;
    const storage = globalThis.localStorage;
    if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return null;
    return storage;
  }

  private readEstadoCuentaFilesFromStorage(cuentaId: string): EstadoCuentaFile[] {
    if (typeof globalThis.localStorage === 'undefined') return [];
    const raw = globalThis.localStorage.getItem(this.estadoCuentaStorageKey(cuentaId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as EstadoCuentaFileMeta[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((f) => Boolean(f?.id && f?.nombre && f?.fecha_subida))
        .map((f) => ({
          id: f.id,
          cuenta_id: cuentaId,
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

  private writeEstadoCuentaFilesToStorage(cuentaId: string, files: EstadoCuentaFile[]): void {
    if (typeof globalThis.localStorage === 'undefined') return;
    const serialized: EstadoCuentaFileMeta[] = files.map((f) => ({
      id: f.id,
      cuenta_id: cuentaId,
      nombre: f.nombre,
      tamano_bytes: f.tamano_bytes,
      mime_type: f.mime_type,
      fecha_subida: f.fecha_subida,
      notas: f.notas,
    }));
    globalThis.localStorage.setItem(this.estadoCuentaStorageKey(cuentaId), JSON.stringify(serialized));
  }

  private createMockFileId(): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `ecf_${Date.now()}_${random}`;
  }
}
