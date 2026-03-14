import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, conceptoLabels, estadoPagoLabels } from '@/data/store';
import type { HistorialPago, Propiedad } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propiedad: Propiedad;
  clienteNombre: string;
  historial: HistorialPago[];
  totalCobrado: number;
  totalPagado: number;
  saldo: number;
}

export default function ReportPreviewDialog({
  open, onOpenChange, propiedad, clienteNombre, historial,
  totalCobrado, totalPagado, saldo,
}: Props) {
  const [titulo, setTitulo] = useState(`Informe de Cartera — ${propiedad.identificador}`);
  const [notasExtra, setNotasExtra] = useState('');
  const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  const downloadPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text(titulo, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 14, 28);
    doc.text(`Cliente: ${clienteNombre}`, 14, 34);
    doc.text(`Propiedad: ${propiedad.identificador} — ${propiedad.direccion}`, 14, 40);

    // Summary
    doc.setFontSize(11);
    doc.text('Resumen Financiero', 14, 52);
    doc.setFontSize(10);
    doc.text(`Total Cobrado: ${formatCurrency(totalCobrado)}`, 14, 59);
    doc.text(`Total Pagado: ${formatCurrency(totalPagado)}`, 14, 65);
    doc.setFont(undefined!, 'bold');
    doc.text(`Monto a la fecha: ${formatCurrency(saldo)}`, 14, 71);
    doc.setFont(undefined!, 'normal');

    // Table
    autoTable(doc, {
      startY: 80,
      head: [['Periodo', 'Concepto', 'Valor Cobrado', 'Valor Pagado', 'Estado', 'Fecha Pago', 'Monto a la fecha']],
      body: historial.map(h => [
        h.periodo,
        conceptoLabels[h.concepto],
        formatCurrency(h.valor_cobrado),
        formatCurrency(h.valor_pagado),
        estadoPagoLabels[h.estado_pago],
        h.fecha_pago || '—',
        formatCurrency(h.monto_a_la_fecha),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [107, 60, 200] },
    });

    // Notes
    if (notasExtra) {
      const finalY = (doc as any).lastAutoTable?.finalY || 160;
      doc.setFontSize(10);
      doc.text('Notas adicionales:', 14, finalY + 10);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(notasExtra, 180);
      doc.text(lines, 14, finalY + 17);
    }

    doc.save(`informe_${propiedad.identificador.replace(/\s/g, '_')}.pdf`);
  };

  const downloadExcel = () => {
    const wsData = [
      [titulo],
      [`Fecha: ${fecha}`],
      [`Cliente: ${clienteNombre}`],
      [`Propiedad: ${propiedad.identificador} — ${propiedad.direccion}`],
      [],
      ['Total Cobrado', formatCurrency(totalCobrado)],
      ['Total Pagado', formatCurrency(totalPagado)],
      ['Monto a la fecha', formatCurrency(saldo)],
      [],
      ['Periodo', 'Concepto', 'Valor Cobrado', 'Valor Pagado', 'Estado', 'Fecha Pago', 'Monto a la fecha'],
      ...historial.map(h => [
        h.periodo,
        conceptoLabels[h.concepto],
        h.valor_cobrado,
        h.valor_pagado,
        estadoPagoLabels[h.estado_pago],
        h.fecha_pago || '—',
        h.monto_a_la_fecha,
      ]),
    ];

    if (notasExtra) {
      wsData.push([], ['Notas adicionales:', notasExtra]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe');
    XLSX.writeFile(wb, `informe_${propiedad.identificador.replace(/\s/g, '_')}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Editar y Descargar Informe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Editable title */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Título del informe</label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>

          {/* Preview */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-sm">
            <p className="text-muted-foreground">Fecha: {fecha}</p>
            <p className="text-muted-foreground">Cliente: <span className="text-foreground font-medium">{clienteNombre}</span></p>
            <p className="text-muted-foreground">Propiedad: <span className="text-foreground font-medium">{propiedad.identificador}</span> — {propiedad.direccion}</p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-card rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Cobrado</p>
                <p className="font-bold text-foreground">{formatCurrency(totalCobrado)}</p>
              </div>
              <div className="bg-card rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="font-bold text-foreground">{formatCurrency(totalPagado)}</p>
              </div>
              <div className="bg-card rounded-lg p-3 text-center border-2 border-primary/30">
                <p className="text-xs text-muted-foreground">Monto a la fecha</p>
                <p className="font-bold text-primary">{formatCurrency(saldo)}</p>
              </div>
            </div>

            {/* Mini table preview */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado'].map(h => (
                      <th key={h} className="text-left px-2 py-1.5 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.slice(0, 5).map(h => (
                    <tr key={h.id} className="border-b border-border/50">
                      <td className="px-2 py-1.5 font-mono">{h.periodo}</td>
                      <td className="px-2 py-1.5">{conceptoLabels[h.concepto]}</td>
                      <td className="px-2 py-1.5">{formatCurrency(h.valor_cobrado)}</td>
                      <td className="px-2 py-1.5">{formatCurrency(h.valor_pagado)}</td>
                      <td className="px-2 py-1.5">{estadoPagoLabels[h.estado_pago]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historial.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">... y {historial.length - 5} registros más</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Notas adicionales (opcional)</label>
            <Textarea
              value={notasExtra}
              onChange={e => setNotasExtra(e.target.value)}
              placeholder="Agrega observaciones que aparecerán al final del informe..."
              rows={3}
            />
          </div>

          {/* Download buttons */}
          <div className="flex gap-3 pt-2">
            <Button onClick={downloadPDF} className="flex-1">
              <FileDown className="w-4 h-4 mr-2" /> Descargar PDF
            </Button>
            <Button onClick={downloadExcel} variant="outline" className="flex-1">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Descargar Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
