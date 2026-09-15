import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Cliente, Cuenta } from '../models';
import type { DataService } from '../services/data.service';
import { renderChartToPng, type ChartPngResult } from './chart-to-png';
import {
  buildClienteCobradoPagadoChartData,
  buildClienteDeudaPorCuentaChartData,
  buildClienteRecaudoUltimosMesesChartData,
  buildClienteResumenFinancieroChartData,
  buildClienteUnidadesPorEdadMoraChartData,
  buildEdadMoraChartOptions,
  buildHistorialConCuenta,
  CLIENT_CHART_BAR_BY_PERIODO_HORIZONTAL_OPTIONS,
  CLIENT_CHART_BAR_HORIZONTAL_OPTIONS,
  CLIENT_CHART_BAR_OPTIONS,
  CLIENT_CHART_DOUGHNUT_OPTIONS,
  type RecaudoMesesVentana,
  type ReportChartPalette,
  unidadesEjeYFromEdadMoraChartData,
} from './client-chart-data';
import {
  buildUnidadGestionExportRows,
  GESTION_EXPORT_HEADERS_CON_UNIDAD,
} from './gestion-report';

export type ClientReportResumenRow = {
  cuenta: Cuenta;
  identificador: string;
  documentoLabel: string;
  correo: string;
  deuda: number;
  edad_mora_dias: number | null;
  fecha_inicio_cobro: string | null;
  fecha_fin_cobro: string | null;
  fecha_alta: string | null;
};

export function buildClientReportResumenRows(
  data: DataService,
  cuentas: Cuenta[],
): ClientReportResumenRow[] {
  return cuentas.map((p) => {
    const r = data.getResumenMoraCobroParaCuenta(p);
    const docLabel = p.cobro_tipo_persona === 'natural' ? 'CC' : 'NIT';
    const documento = p.cobro_documento?.trim() || '—';
    return {
      cuenta: p,
      identificador: p.identificador,
      documentoLabel: documento === '—' ? '—' : `${docLabel} ${documento}`,
      correo: data.formatDeudorEmailCorto(p) || '—',
      deuda: data.getDeudaActualParaCuenta(p),
      edad_mora_dias: r.edad_mora_dias,
      fecha_inicio_cobro: r.fecha_inicio_cobro,
      fecha_fin_cobro: r.fecha_fin_cobro,
      fecha_alta: r.fecha_alta,
    };
  });
}

export function resumenCuentaPdfRow(data: DataService, row: ClientReportResumenRow): string[] {
  const mora = data
    .formatResumenMoraTooltip({
      edad_mora_dias: row.edad_mora_dias,
      fecha_inicio_cobro: row.fecha_inicio_cobro,
      fecha_fin_cobro: row.fecha_fin_cobro,
      fecha_alta: row.fecha_alta,
    })
    .replace(/\n/g, ' | ');
  return [
    row.identificador,
    data.formatDeudorCorto(row.cuenta),
    row.documentoLabel,
    row.correo,
    mora,
    data.formatDeuda(row.deuda),
  ];
}

export type ClientReportChartImages = {
  resumenFinanciero: ChartPngResult | null;
  deudaPorUnidad: ChartPngResult | null;
  cobradoPagado: ChartPngResult | null;
  pagadoPorPeriodo: ChartPngResult | null;
  unidadesPorEdadMora: ChartPngResult | null;
};

/** Genera PNG offscreen de las gráficas del cliente (portal / informe). */
export function buildClientReportChartImages(
  data: DataService,
  cuentas: Cuenta[],
  options?: { palette?: ReportChartPalette; recaudoMeses?: RecaudoMesesVentana },
): ClientReportChartImages {
  const palette = options?.palette ?? 'morado';
  const recaudoMeses = options?.recaudoMeses ?? 3;
  const historial = buildHistorialConCuenta(data, cuentas);

  const cobrado = cuentas.reduce((sum, p) => sum + data.getTotalCobradoParaCuenta(p), 0);
  const pagado = cuentas.reduce((sum, p) => sum + data.getTotalPagadoParaCuenta(p), 0);
  const deuda = cuentas.reduce((sum, p) => sum + data.getDeudaActualParaCuenta(p), 0);
  const resumenData = buildClienteResumenFinancieroChartData(cobrado, pagado, deuda, palette);
  const resumenFinanciero = resumenData
    ? renderChartToPng(
        {
          type: 'doughnut',
          data: resumenData,
          options: CLIENT_CHART_DOUGHNUT_OPTIONS,
        },
        { width: 700, height: 380 },
      )
    : null;

  const deudaPorUnidad =
    cuentas.length > 0
      ? renderChartToPng(
          {
            type: 'bar',
            data: buildClienteDeudaPorCuentaChartData(data, cuentas, { palette }),
            options: CLIENT_CHART_BAR_HORIZONTAL_OPTIONS,
          },
          {
            width: 900,
            height: Math.min(700, Math.max(280, 56 + cuentas.length * 36)),
          },
        )
      : null;

  const cobradoPagado =
    historial.length > 0
      ? renderChartToPng(
          {
            type: 'bar',
            data: buildClienteCobradoPagadoChartData(historial),
            options: CLIENT_CHART_BAR_OPTIONS,
          },
          { width: 900, height: 400 },
        )
      : null;

  const pagadoPorPeriodo = renderChartToPng(
    {
      type: 'bar',
      data: buildClienteRecaudoUltimosMesesChartData(historial, recaudoMeses, { palette }),
      options: CLIENT_CHART_BAR_BY_PERIODO_HORIZONTAL_OPTIONS,
    },
    {
      width: 900,
      height: Math.min(700, Math.max(280, 56 + recaudoMeses * 36)),
    },
  );

  const unidadesPorEdadMoraData =
    cuentas.length > 0
      ? buildClienteUnidadesPorEdadMoraChartData(data, cuentas, { palette })
      : null;
  const unidadesPorEdadMora = unidadesPorEdadMoraData
    ? renderChartToPng(
        {
          type: 'bar',
          data: unidadesPorEdadMoraData,
          options: buildEdadMoraChartOptions(
            unidadesEjeYFromEdadMoraChartData(unidadesPorEdadMoraData),
          ),
        },
        { width: 900, height: 380 },
      )
    : null;

  return {
    resumenFinanciero,
    deudaPorUnidad,
    cobradoPagado,
    pagadoPorPeriodo,
    unidadesPorEdadMora,
  };
}

function appendChartToPdf(
  doc: jsPDF,
  title: string,
  chart: ChartPngResult,
  startY: number,
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const maxWidth = pageWidth - marginX * 2;
  const aspect = chart.height / chart.width;
  const imgWidth = maxWidth;
  const imgHeight = imgWidth * aspect;
  let y = startY;

  if (y + 10 + imgHeight > pageHeight - 14) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(11);
  doc.text(title, marginX, y);
  y += 6;
  doc.addImage(chart.dataUrl, 'PNG', marginX, y, imgWidth, imgHeight);
  return y + imgHeight + 10;
}

export function downloadClientGeneralReportPdf(options: {
  data: DataService;
  cliente: Cliente;
  cuentas: Cuenta[];
  titulo?: string;
  notas?: string;
  fecha?: string;
  chartPalette?: ReportChartPalette;
  recaudoMeses?: RecaudoMesesVentana;
}): void {
  const { data, cliente, cuentas } = options;
  const tituloDoc = options.titulo?.trim() || `Informe General – ${cliente.nombre}`;
  const fecha =
    options.fecha ??
    new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const notas = options.notas?.trim();
  const recaudoMeses = options.recaudoMeses ?? 3;

  const totalCobrado = cuentas.reduce((sum, p) => sum + data.getTotalCobradoParaCuenta(p), 0);
  const totalPagado = cuentas.reduce((sum, p) => sum + data.getTotalPagadoParaCuenta(p), 0);
  const saldo = cuentas.reduce((sum, p) => sum + data.getDeudaActualParaCuenta(p), 0);
  const resumen = buildClientReportResumenRows(data, cuentas);
  const transacciones = cuentas.flatMap((p) => {
    const hist = data.getHistorialByCuenta(p.id);
    return hist.map((h) => ({ ...h, cuenta: p.identificador }));
  });
  const charts = buildClientReportChartImages(data, cuentas, {
    palette: options.chartPalette ?? 'morado',
    recaudoMeses,
  });

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(tituloDoc, 14, 20);
  doc.setFontSize(10);
  doc.text(`Fecha: ${fecha}`, 14, 28);
  doc.text(`Cliente: ${cliente.nombre}`, 14, 34);
  doc.setFontSize(11);
  doc.text('Resumen Financiero', 14, 46);
  doc.setFontSize(10);
  doc.text(`Total Cobrado: ${data.formatCurrency(totalCobrado)}`, 14, 53);
  doc.text(`Total Pagado: ${data.formatCurrency(totalPagado)}`, 14, 59);
  doc.setFont(undefined as unknown as string, 'bold');
  doc.text(`Deuda a la fecha: ${data.formatCurrency(saldo)}`, 14, 65);
  doc.setFont(undefined as unknown as string, 'normal');

  let startY = 74;
  if (notas) {
    doc.setFontSize(10);
    doc.text('Notas:', 14, startY);
    startY += 6;
    const lines = doc.splitTextToSize(notas, 180);
    doc.text(lines, 14, startY);
    startY += lines.length * 5 + 8;
  }

  if (charts.resumenFinanciero) {
    startY = appendChartToPdf(doc, 'Resumen financiero', charts.resumenFinanciero, startY);
  }
  if (charts.deudaPorUnidad) {
    startY = appendChartToPdf(doc, 'Deuda a la fecha por unidad', charts.deudaPorUnidad, startY);
  }
  if (charts.cobradoPagado) {
    startY = appendChartToPdf(
      doc,
      'Cobrado vs Pagado por periodo',
      charts.cobradoPagado,
      startY,
    );
  }
  if (charts.pagadoPorPeriodo) {
    startY = appendChartToPdf(
      doc,
      `Pagado por periodo (últimos ${recaudoMeses} meses)`,
      charts.pagadoPorPeriodo,
      startY,
    );
  }
  if (charts.unidadesPorEdadMora) {
    startY = appendChartToPdf(
      doc,
      'Deuda a la fecha por edad en mora',
      charts.unidadesPorEdadMora,
      startY,
    );
  }

  doc.setFontSize(11);
  doc.text('Por cuenta (unidad)', 14, startY);
  doc.setFontSize(10);
  startY += 6;
  autoTable(doc, {
    startY,
    head: [['Unidad', 'Deudor', 'Documento', 'Correo', 'Edad en mora', 'Deuda a la fecha']],
    body: resumen.map((row) => resumenCuentaPdfRow(data, row)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [107, 60, 200] },
  });

  const docLt = doc as unknown as { lastAutoTable?: { finalY: number } };
  const yAfterResumen = docLt.lastAutoTable?.finalY ?? startY + 24;
  doc.setFontSize(11);
  doc.text('Detalle de transacciones', 14, yAfterResumen + 8);
  doc.setFontSize(10);
  autoTable(doc, {
    startY: yAfterResumen + 14,
    head: [['Cuenta', 'Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado']],
    body: transacciones.map((h) => [
      h.cuenta,
      h.periodo,
      data.conceptoLabels[h.concepto],
      data.formatCurrency(h.valor_cobrado),
      data.formatCurrency(h.valor_pagado),
      data.estadoPagoLabels[h.estado_pago],
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [107, 60, 200] },
  });

  const yAfterTx = docLt.lastAutoTable?.finalY ?? yAfterResumen + 24;
  const gestionRows = buildUnidadGestionExportRows(data, cuentas);
  doc.setFontSize(11);
  doc.text('Trazabilidad de cobro por unidad', 14, yAfterTx + 10);
  if (gestionRows.length === 0) {
    doc.setFontSize(10);
    doc.text(
      'No hay trazabilidad de cobro registrada en las unidades de este cliente.',
      14,
      yAfterTx + 16,
    );
  } else {
    autoTable(doc, {
      startY: yAfterTx + 14,
      head: [[...GESTION_EXPORT_HEADERS_CON_UNIDAD]],
      body: gestionRows,
      styles: { fontSize: 8, overflow: 'linebreak' },
      columnStyles: { 4: { cellWidth: 70 } },
      headStyles: { fillColor: [107, 60, 200] },
    });
  }

  doc.save(`informe_general_${cliente.nombre.replace(/\s/g, '_')}.pdf`);
}
