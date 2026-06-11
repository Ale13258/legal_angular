import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Cliente, Propiedad } from '../models';
import type { DataService } from '../services/data.service';

export type ClientReportResumenRow = {
  propiedad: Propiedad;
  identificador: string;
  documentoLabel: string;
  correo: string;
  deuda: number;
  edad_mora_dias: number | null;
  fecha_inicio_cobro: string | null;
  fecha_fin_cobro: string | null;
};

export function buildClientReportResumenRows(
  data: DataService,
  propiedades: Propiedad[],
): ClientReportResumenRow[] {
  return propiedades.map((p) => {
    const r = data.getResumenMoraCobroParaPropiedad(p);
    const docLabel = p.cobro_tipo_persona === 'natural' ? 'CC' : 'NIT';
    const documento = p.cobro_documento?.trim() || '—';
    return {
      propiedad: p,
      identificador: p.identificador,
      documentoLabel: documento === '—' ? '—' : `${docLabel} ${documento}`,
      correo: p.cobro_email?.trim() || '—',
      deuda: data.getDeudaActualParaPropiedad(p),
      edad_mora_dias: r.edad_mora_dias,
      fecha_inicio_cobro: r.fecha_inicio_cobro,
      fecha_fin_cobro: r.fecha_fin_cobro,
    };
  });
}

export function resumenPropiedadPdfRow(data: DataService, row: ClientReportResumenRow): string[] {
  const mora = data
    .formatResumenMoraTooltip({
      edad_mora_dias: row.edad_mora_dias,
      fecha_inicio_cobro: row.fecha_inicio_cobro,
      fecha_fin_cobro: row.fecha_fin_cobro,
    })
    .replace(/\n/g, ' | ');
  return [
    row.identificador,
    data.formatDeudorCorto(row.propiedad),
    row.documentoLabel,
    row.correo,
    mora,
    data.formatDeuda(row.deuda),
  ];
}

export function downloadClientGeneralReportPdf(options: {
  data: DataService;
  cliente: Cliente;
  propiedades: Propiedad[];
  titulo?: string;
  notas?: string;
  fecha?: string;
}): void {
  const { data, cliente, propiedades } = options;
  const tituloDoc = options.titulo?.trim() || `Informe General – ${cliente.nombre}`;
  const fecha =
    options.fecha ??
    new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const notas = options.notas?.trim();

  const totalCobrado = propiedades.reduce((sum, p) => sum + data.getTotalCobradoParaPropiedad(p), 0);
  const totalPagado = propiedades.reduce((sum, p) => sum + data.getTotalPagadoParaPropiedad(p), 0);
  const saldo = propiedades.reduce((sum, p) => sum + data.getDeudaActualParaPropiedad(p), 0);
  const resumen = buildClientReportResumenRows(data, propiedades);
  const transacciones = propiedades.flatMap((p) => {
    const hist = data.getHistorialByPropiedad(p.id);
    return hist.map((h) => ({ ...h, propiedad: p.identificador }));
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

  doc.setFontSize(11);
  doc.text('Por propiedad (unidad)', 14, startY);
  doc.setFontSize(10);
  startY += 6;
  autoTable(doc, {
    startY,
    head: [['Unidad', 'Deudor', 'Documento', 'Correo', 'Edad en mora', 'Deuda a la fecha']],
    body: resumen.map((row) => resumenPropiedadPdfRow(data, row)),
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
    head: [['Propiedad', 'Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado']],
    body: transacciones.map((h) => [
      h.propiedad,
      h.periodo,
      data.conceptoLabels[h.concepto],
      data.formatCurrency(h.valor_cobrado),
      data.formatCurrency(h.valor_pagado),
      data.estadoPagoLabels[h.estado_pago],
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [107, 60, 200] },
  });

  doc.save(`informe_general_${cliente.nombre.replace(/\s/g, '_')}.pdf`);
}
