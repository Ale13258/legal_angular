import type { ChartConfiguration, Plugin } from 'chart.js';
import type { Cuenta, HistorialPago } from '../models';
import { clasificarEtapaCobranza, type EtapaCobranzaCodigo } from '../mora-etapas';
import type { DataService } from '../services/data.service';

function toMoney(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Etiqueta legible para eje de periodos (`2026-01` → `ene 2026`). */
export function formatPeriodoChartLabel(periodo: string): string {
  const raw = String(periodo ?? '').trim();
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!match) return raw || '—';
  const year = match[1]!;
  const month = Number(match[2]);
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  const name = months[month - 1];
  return name ? `${name} ${year}` : raw;
}

function formatMoneyTick(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

export type HistorialConCuenta = HistorialPago & { cuenta: string };

export function buildHistorialConCuenta(
  data: DataService,
  cuentas: Cuenta[],
): HistorialConCuenta[] {
  return cuentas
    .flatMap((p) => {
      const hist = data.getHistorialByCuenta(p.id);
      return hist.map((h) => ({ ...h, cuenta: p.identificador }));
    })
    .sort(
      (a, b) => b.periodo.localeCompare(a.periodo) || b.created_at.localeCompare(a.created_at),
    );
}

/** Barras: Cobrado vs Pagado por periodo (mismo criterio que el portal del cliente). */
export function buildClienteCobradoPagadoChartData(
  historial: HistorialConCuenta[],
): ChartConfiguration<'bar'>['data'] {
  const periodos = [...new Set(historial.map((h) => h.periodo))].sort();
  return {
    labels: periodos.map(formatPeriodoChartLabel),
    datasets: [
      {
        label: 'Cobrado',
        data: periodos.map((periodo) =>
          historial
            .filter((h) => h.periodo === periodo)
            .reduce((sum, h) => sum + toMoney(h.valor_cobrado), 0),
        ),
        backgroundColor: '#6b3cc8',
      },
      {
        label: 'Pagado',
        data: periodos.map((periodo) =>
          historial
            .filter((h) => h.periodo === periodo)
            .reduce((sum, h) => sum + toMoney(h.valor_pagado), 0),
        ),
        backgroundColor: '#22c55e',
      },
    ],
  };
}

/** Barras: Cobrado vs Pagado por periodo para una sola unidad. */
export function buildCuentaCobradoPagadoChartData(
  historial: HistorialPago[],
): ChartConfiguration<'bar'>['data'] {
  return buildClienteCobradoPagadoChartData(
    historial.map((h) => ({ ...h, cuenta: '' })),
  );
}

/**
 * Pastel: composición de la unidad (pagado vs deuda pendiente).
 * Si ambos son 0, no hay datos útiles.
 */
export function buildCuentaComposicionChartData(
  totalPagado: number,
  deudaActual: number,
): ChartConfiguration<'doughnut'>['data'] | null {
  const pagado = Math.max(0, toMoney(totalPagado));
  const deuda = Math.max(0, toMoney(deudaActual));
  if (pagado <= 0 && deuda <= 0) return null;
  return {
    labels: ['Pagado', 'Deuda a la fecha'],
    datasets: [
      {
        data: [pagado, deuda],
        backgroundColor: ['#22c55e', '#6b3cc8'],
        borderWidth: 0,
      },
    ],
  };
}

/** Paleta del sitio para la gráfica del informe. */
export type ReportChartPalette = 'verde' | 'naranja' | 'morado';

export const REPORT_CHART_PALETTE_COLORS: Record<ReportChartPalette, string> = {
  verde: '#22c55e',
  naranja: '#f97316',
  morado: '#6b3cc8',
};

export const REPORT_CHART_PALETTE_OPTIONS: {
  id: ReportChartPalette;
  label: string;
  color: string;
}[] = [
  { id: 'verde', label: 'Verde', color: REPORT_CHART_PALETTE_COLORS.verde },
  { id: 'naranja', label: 'Naranja', color: REPORT_CHART_PALETTE_COLORS.naranja },
  { id: 'morado', label: 'Morado', color: REPORT_CHART_PALETTE_COLORS.morado },
];

/** Ventana de meses para la gráfica de pago por periodos. */
export type RecaudoMesesVentana = 3 | 6 | 9 | 12;

export const RECAUDO_MESES_OPTIONS: { meses: RecaudoMesesVentana; label: string }[] = [
  { meses: 3, label: '3 meses' },
  { meses: 6, label: '6 meses' },
  { meses: 9, label: '9 meses' },
  { meses: 12, label: '12 meses' },
];

/** Últimos N periodos `YYYY-MM` (incluye el mes de referencia). */
export function lastNPeriodoKeys(meses: number, ref: Date = new Date()): string[] {
  const n = Math.max(1, Math.floor(meses));
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${y}-${m}`);
  }
  return keys;
}

/**
 * Pagado (`valor_pagado`) mes a mes en los últimos N meses calendario.
 * Incluye meses sin movimientos con valor 0.
 */
export function buildClienteRecaudoUltimosMesesChartData(
  historial: HistorialConCuenta[],
  meses: RecaudoMesesVentana,
  options?: { palette?: ReportChartPalette },
): ChartConfiguration<'bar'>['data'] {
  const periodos = lastNPeriodoKeys(meses);
  const color = REPORT_CHART_PALETTE_COLORS[options?.palette ?? 'verde'];
  return {
    labels: periodos.map(formatPeriodoChartLabel),
    datasets: [
      {
        label: 'Pagado',
        data: periodos.map((periodo) =>
          historial
            .filter((h) => h.periodo === periodo)
            .reduce((sum, h) => sum + toMoney(h.valor_pagado), 0),
        ),
        backgroundColor: color,
      },
    ],
  };
}

/** Barras horizontales: deuda actual por unidad. */
export function buildClienteDeudaPorCuentaChartData(
  data: DataService,
  cuentas: Cuenta[],
  options?: { palette?: ReportChartPalette },
): ChartConfiguration<'bar'>['data'] {
  const color = REPORT_CHART_PALETTE_COLORS[options?.palette ?? 'morado'];
  return {
    labels: cuentas.map((p) => p.identificador),
    datasets: [
      {
        label: 'Deuda a la fecha',
        data: cuentas.map((p) => data.getDeudaActualParaCuenta(p)),
        backgroundColor: color,
      },
    ],
  };
}

/** Pastel: cobrado / pagado / deuda a la fecha del cliente. */
export function buildClienteResumenFinancieroChartData(
  cobrado: number,
  pagado: number,
  deuda: number,
  palette: ReportChartPalette = 'morado',
): ChartConfiguration<'doughnut'>['data'] | null {
  const c = Math.max(0, toMoney(cobrado));
  const p = Math.max(0, toMoney(pagado));
  const d = Math.max(0, toMoney(deuda));
  if (c <= 0 && p <= 0 && d <= 0) return null;
  const accent = REPORT_CHART_PALETTE_COLORS[palette];
  const deudaColor = palette === 'naranja' ? '#6b3cc8' : '#f97316';
  const pagadoColor = palette === 'verde' ? '#86efac' : '#22c55e';
  return {
    labels: ['Cobrado', 'Pagado', 'Deuda a la fecha'],
    datasets: [
      {
        data: [c, p, d],
        backgroundColor: [accent, pagadoColor, deudaColor],
        borderWidth: 0,
      },
    ],
  };
}

/** Rangos de edad en mora usados en el informe del cliente (barras verticales). */
export const EDAD_MORA_CHART_BUCKETS = [
  { codigo: 'al_dia' as const, label: 'Al día' },
  { codigo: 'persuasivo_1_30' as const, label: '1–30 d' },
  { codigo: 'persuasivo_31_60' as const, label: '31–60 d' },
  { codigo: 'probable_juridico_61_90' as const, label: '61–90 d' },
  { codigo: 'juridico_mas_90' as const, label: '>90 d' },
] as const;

const EDAD_MORA_BUCKET_COLORS: Record<(typeof EDAD_MORA_CHART_BUCKETS)[number]['codigo'], string> = {
  al_dia: '#22c55e',
  persuasivo_1_30: '#84cc16',
  persuasivo_31_60: '#eab308',
  probable_juridico_61_90: '#f97316',
  juridico_mas_90: '#ef4444',
};

/**
 * Detalle por rango: cuántas unidades, cuáles y deuda a la fecha agregada.
 */
export type EdadMoraBucketDetalle = {
  codigo: (typeof EDAD_MORA_CHART_BUCKETS)[number]['codigo'] | 'sin_dato';
  label: string;
  count: number;
  unidades: string[];
  deuda: number;
};

export function buildClienteEdadMoraBucketDetalle(
  data: DataService,
  cuentas: Cuenta[],
): EdadMoraBucketDetalle[] {
  const byCodigo: Record<EtapaCobranzaCodigo, string[]> = {
    sin_dato: [],
    al_dia: [],
    persuasivo_1_30: [],
    persuasivo_31_60: [],
    probable_juridico_61_90: [],
    juridico_mas_90: [],
  };
  const deudaByCodigo: Record<EtapaCobranzaCodigo, number> = {
    sin_dato: 0,
    al_dia: 0,
    persuasivo_1_30: 0,
    persuasivo_31_60: 0,
    probable_juridico_61_90: 0,
    juridico_mas_90: 0,
  };

  for (const cuenta of cuentas) {
    const dias = data.getResumenMoraCobroParaCuenta(cuenta).edad_mora_dias;
    const codigo = clasificarEtapaCobranza(dias);
    byCodigo[codigo].push(cuenta.identificador?.trim() || '—');
    deudaByCodigo[codigo] += data.getDeudaActualParaCuenta(cuenta);
  }

  const chartBuckets: EdadMoraBucketDetalle[] = EDAD_MORA_CHART_BUCKETS.map((b) => ({
    codigo: b.codigo,
    label: b.label,
    count: byCodigo[b.codigo].length,
    unidades: byCodigo[b.codigo],
    deuda: deudaByCodigo[b.codigo],
  }));

  if (byCodigo.sin_dato.length > 0) {
    chartBuckets.push({
      codigo: 'sin_dato',
      label: 'Sin dato',
      count: byCodigo.sin_dato.length,
      unidades: byCodigo.sin_dato,
      deuda: deudaByCodigo.sin_dato,
    });
  }

  return chartBuckets;
}

function formatDeudaChartLabel(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

/**
 * Barras verticales por rango de edad en mora.
 * Altura = nº de unidades; eje Y = números de unidad; bajo cada rango se muestra la deuda a la fecha.
 * `palette` unifica el color (verde / naranja / morado del sitio).
 */
export function buildClienteUnidadesPorEdadMoraChartData(
  data: DataService,
  cuentas: Cuenta[],
  options?: { palette?: ReportChartPalette },
): ChartConfiguration<'bar'>['data'] {
  const detalle = buildClienteEdadMoraBucketDetalle(data, cuentas).filter(
    (b) => b.codigo !== 'sin_dato',
  );
  const palette = options?.palette;
  const solid = palette ? REPORT_CHART_PALETTE_COLORS[palette] : null;

  return {
    // Rango + deuda a la fecha bajo la barra (el título del eje X será «Deuda a la fecha»).
    labels: detalle.map((b) =>
      b.count > 0 || b.deuda > 0 ? [b.label, formatDeudaChartLabel(b.deuda)] : b.label,
    ),
    datasets: [
      {
        label: 'Unidades',
        data: detalle.map((b) => b.count),
        backgroundColor: detalle.map((b) =>
          solid
            ? solid
            : EDAD_MORA_BUCKET_COLORS[b.codigo as keyof typeof EDAD_MORA_BUCKET_COLORS],
        ),
        unidadesPorBarra: detalle.map((b) => b.unidades),
        deudaPorBarra: detalle.map((b) => b.deuda),
      } as ChartConfiguration<'bar'>['data']['datasets'][number] & {
        unidadesPorBarra: string[][];
        deudaPorBarra: number[];
      },
    ],
  };
}

/** Identificadores para el eje Y (los de la barra más alta / única con datos). */
export function unidadesEjeYFromEdadMoraChartData(
  chartData: ChartConfiguration<'bar'>['data'],
): string[] {
  const ds = chartData.datasets[0] as { unidadesPorBarra?: string[][] } | undefined;
  const porBarra = ds?.unidadesPorBarra ?? [];
  const conDatos = porBarra.filter((u) => u.length > 0);
  if (conDatos.length === 0) return [];
  if (conDatos.length === 1) return conDatos[0]!;
  return conDatos.reduce((best, u) => (u.length > best.length ? u : best), [] as string[]);
}

function unidadesPorBarraFromContext(ctx: {
  dataset: unknown;
  dataIndex: number;
}): string[] {
  const ds = ctx.dataset as { unidadesPorBarra?: string[][] };
  return ds.unidadesPorBarra?.[ctx.dataIndex] ?? [];
}

function deudaPorBarraFromContext(ctx: {
  dataset: unknown;
  dataIndex: number;
}): number {
  const ds = ctx.dataset as { deudaPorBarra?: number[] };
  const raw = ds.deudaPorBarra?.[ctx.dataIndex];
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function edadMoraTooltipCallbacks(): NonNullable<
  NonNullable<ChartConfiguration<'bar'>['options']>['plugins']
>['tooltip'] {
  return {
    callbacks: {
      title: (items) => {
        const label = items[0]?.label;
        const rango = label?.split(',')[0]?.trim() || label;
        return rango ? `Edad en mora: ${rango}` : '';
      },
      label: (ctx) => {
        const n = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : Number(ctx.raw);
        const units = Number.isFinite(n) ? n : 0;
        const deuda = deudaPorBarraFromContext(ctx);
        const aptos = unidadesPorBarraFromContext(ctx);
        const lines = [
          `${units} ${units === 1 ? 'unidad' : 'unidades'}`,
          `Deuda a la fecha: ${formatDeudaChartLabel(deuda)}`,
        ];
        if (aptos.length > 0) lines.push(...aptos.map((id) => `· ${id}`));
        return lines;
      },
    },
  };
}

/** Eje Y = números de unidad; título bajo la gráfica = Deuda a la fecha. */
export function buildEdadMoraChartOptions(
  unidadesEjeY: string[],
  opts?: { preview?: boolean },
): ChartConfiguration<'bar'>['options'] {
  const preview = !!opts?.preview;
  return {
    responsive: preview,
    maintainAspectRatio: false,
    animation: preview ? undefined : false,
    layout: { padding: { bottom: 8, left: 8, right: 8, top: 8 } },
    plugins: {
      legend: { display: false },
      tooltip: edadMoraTooltipCallbacks(),
    },
    scales: {
      x: {
        title: { display: true, text: 'Deuda a la fecha', font: { size: 11 } },
        ticks: { autoSkip: false, font: { size: 10 }, maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Unidad', font: { size: 11 } },
        ticks: {
          stepSize: 1,
          precision: 0,
          autoSkip: false,
          font: { size: 10 },
          callback: (value) => {
            const v = typeof value === 'number' ? value : Number(value);
            if (!Number.isInteger(v) || v < 1) return '';
            return unidadesEjeY[v - 1] ?? '';
          },
        },
      },
    },
  };
}

/** Barras verticales agregadas por rango (PDF). */
export const CLIENT_CHART_BAR_EDAD_MORA_OPTIONS: ChartConfiguration<'bar'>['options'] =
  buildEdadMoraChartOptions([]);

/** Preview UI: una barra por rango; altura = nº de unidades en ese rango. */
export const PREVIEW_CHART_BAR_EDAD_MORA_OPTIONS: ChartConfiguration<'bar'>['options'] =
  buildEdadMoraChartOptions([], { preview: true });

const categoryTickOpts = {
  autoSkip: false,
  maxRotation: 45,
  minRotation: 0,
  font: { size: 11 },
};

export const CLIENT_CHART_BAR_OPTIONS: ChartConfiguration<'bar'>['options'] = {
  responsive: false,
  animation: false,
  layout: { padding: { bottom: 8, left: 4, right: 8 } },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        title: (items) => {
          const label = items[0]?.label;
          return label ? `Periodo: ${label}` : '';
        },
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Periodo', font: { size: 11 } },
      ticks: categoryTickOpts,
    },
    y: {
      beginAtZero: true,
      title: { display: true, text: 'Valor ($)', font: { size: 11 } },
      ticks: {
        callback: (value) => formatMoneyTick(value),
      },
    },
  },
};

/** Barras horizontales: periodos a la izquierda (eje vertical), valores abajo. */
export const CLIENT_CHART_BAR_BY_PERIODO_HORIZONTAL_OPTIONS: ChartConfiguration<'bar'>['options'] =
  {
    responsive: false,
    animation: false,
    indexAxis: 'y',
    layout: { padding: { left: 8, right: 12, top: 4, bottom: 4 } },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          title: (items) => {
            const label = items[0]?.label;
            return label ? `Periodo: ${label}` : '';
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Valor ($)', font: { size: 11 } },
        ticks: {
          callback: (value) => formatMoneyTick(value),
        },
      },
      y: {
        title: { display: true, text: 'Periodo', font: { size: 11 } },
        ticks: {
          autoSkip: false,
          font: { size: 11 },
        },
      },
    },
  };

export const CLIENT_CHART_BAR_HORIZONTAL_OPTIONS: ChartConfiguration<'bar'>['options'] = {
  ...CLIENT_CHART_BAR_OPTIONS,
  indexAxis: 'y',
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: 'Valor ($)', font: { size: 11 } },
      ticks: {
        callback: (value) => formatMoneyTick(value),
      },
    },
    y: {
      title: { display: true, text: 'Unidad', font: { size: 11 } },
      ticks: {
        autoSkip: false,
        font: { size: 11 },
      },
    },
  },
};

/** Preview: deuda (o conteos) por unidad en barras horizontales. */
export const PREVIEW_CHART_DEUDA_UNIDAD_OPTIONS: ChartConfiguration<'bar'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: 'Valor ($)', font: { size: 11 } },
      ticks: {
        callback: (value) => formatMoneyTick(value),
      },
    },
    y: {
      title: { display: true, text: 'Unidad', font: { size: 11 } },
      ticks: { autoSkip: false, font: { size: 11 } },
    },
  },
};

export function suggestedUnidadChartHeightPx(unidadCount: number): number {
  const n = Math.max(0, unidadCount);
  return Math.min(520, Math.max(180, 48 + n * 36));
}

/** Opciones para preview en UI (responsive) — periodos visibles en el eje vertical. */
export const PREVIEW_CHART_BAR_OPTIONS: ChartConfiguration<'bar'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { position: 'top' },
    tooltip: {
      callbacks: {
        title: (items) => {
          const label = items[0]?.label;
          return label ? `Periodo: ${label}` : '';
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: 'Valor ($)', font: { size: 11 } },
      ticks: {
        callback: (value) => formatMoneyTick(value),
      },
    },
    y: {
      title: { display: true, text: 'Periodo', font: { size: 11 } },
      ticks: {
        autoSkip: false,
        font: { size: 11 },
      },
    },
  },
};

function doughnutSliceTotal(chart: {
  data: { datasets: { data?: unknown }[] };
}): number {
  const raw = chart.data.datasets[0]?.data;
  if (!Array.isArray(raw)) return 0;
  return raw.reduce<number>((sum, v) => {
    const n = typeof v === 'number' ? v : Number(v);
    return sum + (Number.isFinite(n) ? Math.max(0, n) : 0);
  }, 0);
}

/** Porcentajes visibles dentro de cada porción del pastel (y en PDF). */
export const DOUGHNUT_PERCENT_LABELS_PLUGIN: Plugin<'doughnut'> = {
  id: 'doughnutPercentLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || meta.hidden) return;
    const dataset = chart.data.datasets[0];
    if (!dataset || !Array.isArray(dataset.data)) return;
    const total = doughnutSliceTotal(chart);
    if (total <= 0) return;

    meta.data.forEach((element, index) => {
      const raw = dataset.data[index];
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value) || value <= 0) return;
      const pct = Math.round((value / total) * 100);
      if (pct < 1) return;

      const pos = element.tooltipPosition(true);
      const x = typeof pos.x === 'number' ? pos.x : null;
      const y = typeof pos.y === 'number' ? pos.y : null;
      if (x == null || y == null) return;
      ctx.save();
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = `${pct}%`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x, y);
      ctx.restore();
    });
  },
};

function doughnutLegendWithPercent(): NonNullable<
  NonNullable<ChartConfiguration<'doughnut'>['options']>['plugins']
>['legend'] {
  return {
    position: 'bottom',
    labels: {
      generateLabels: (chart) => {
        const labels = chart.data.labels ?? [];
        const dataset = chart.data.datasets[0];
        const values = Array.isArray(dataset?.data) ? dataset.data : [];
        const total = doughnutSliceTotal(chart);
        const colors = dataset?.backgroundColor;
        return labels.map((label, i) => {
          const raw = values[i];
          const value = typeof raw === 'number' ? raw : Number(raw);
          const pct =
            total > 0 && Number.isFinite(value) ? Math.round((value / total) * 100) : 0;
          const fill = Array.isArray(colors) ? String(colors[i] ?? '#999') : String(colors ?? '#999');
          return {
            text: `${String(label)} (${pct}%)`,
            fillStyle: fill,
            strokeStyle: fill,
            lineWidth: 0,
            hidden: false,
            index: i,
          };
        });
      },
    },
  };
}

export const PREVIEW_CHART_DOUGHNUT_OPTIONS: ChartConfiguration<'doughnut'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: doughnutLegendWithPercent(),
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const name = ctx.label ?? '';
          const value = typeof ctx.parsed === 'number' ? ctx.parsed : Number(ctx.raw);
          const data = ctx.dataset.data as number[];
          const total = data.reduce((s, v) => s + (Number(v) || 0), 0);
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return `${name}: ${formatMoneyTick(value)} (${pct}%)`;
        },
      },
    },
  },
};

export const CLIENT_CHART_DOUGHNUT_OPTIONS: ChartConfiguration<'doughnut'>['options'] = {
  responsive: false,
  animation: false,
  plugins: {
    legend: doughnutLegendWithPercent(),
  },
};
