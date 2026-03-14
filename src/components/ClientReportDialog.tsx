import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, getHistorialByPropiedad, conceptoLabels, estadoPagoLabels } from '@/data/store';
import type { Propiedad, Cliente } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente;
  propiedades: Propiedad[];
}

export default function ClientReportDialog({ open, onOpenChange, cliente, propiedades }: Props) {
  const [titulo, setTitulo] = useState(`Informe General — ${cliente.nombre}`);
  const [notasExtra, setNotasExtra] = useState('');
  const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  const allData = propiedades.flatMap(p => {
    const hist = getHistorialByPropiedad(p.id);
    return hist.map(h => ({ ...h, propiedad: p.identificador }));
  });

  const totalCobrado = allData.reduce((s, h) => s + h.valor_cobrado, 0);
  const totalPagado = allData.reduce((s, h) => s + h.valor_pagado, 0);
  const saldo = totalCobrado - totalPagado;

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(titulo, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 14, 28);
    doc.text(`Cliente: ${cliente.nombre}`, 14, 34);
    doc.text(`Documento: ${cliente.documento}`, 14, 40);

    doc.setFontSize(11);
    doc.text('Resumen Financiero', 14, 52);
    doc.setFontSize(10);
    doc.text(`Total Cobrado: ${formatCurrency(totalCobrado)}`, 14, 59);
    doc.text(`Total Pagado: ${formatCurrency(totalPagado)}`, 14, 65);
    doc.setFont(undefined!, 'bold');
    doc.text(`Monto a la fecha: ${formatCurrency(saldo)}`, 14, 71);
    doc.setFont(undefined!, 'normal');

    autoTable(doc, {
      startY: 80,
      head: [['Propiedad', 'Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado', 'Fecha Pago']],
      body: allData.map(h => [
        h.propiedad,
        h.periodo,
        conceptoLabels[h.concepto],
        formatCurrency(h.valor_cobrado),
        formatCurrency(h.valor_pagado),
        estadoPagoLabels[h.estado_pago],
        h.fecha_pago || '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [107, 60, 200] },
    });

    if (notasExtra) {
      const finalY = (doc as any).lastAutoTable?.finalY || 160;
      doc.setFontSize(10);
      doc.text('Notas adicionales:', 14, finalY + 10);
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(notasExtra, 180), 14, finalY + 17);
    }

    doc.save(`informe_general_${cliente.nombre.replace(/\s/g, '_')}.pdf`);
  };

  const downloadExcel = () => {
    const wsData = [
      [titulo],
      [`Fecha: ${fecha}`],
      [`Cliente: ${cliente.nombre}`],
      [`Documento: ${cliente.documento}`],
      [],
      ['Total Cobrado', formatCurrency(totalCobrado)],
      ['Total Pagado', formatCurrency(totalPagado)],
      ['Monto a la fecha', formatCurrency(saldo)],
      [],
      ['Propiedad', 'Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado', 'Fecha Pago'],
      ...allData.map(h => [
        h.propiedad, h.periodo, conceptoLabels[h.concepto],
        h.valor_cobrado, h.valor_pagado, estadoPagoLabels[h.estado_pago], h.fecha_pago || '—',
      ]),
    ];
    if (notasExtra) wsData.push([], ['Notas adicionales:', notasExtra]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe General');
    XLSX.writeFile(wb, `informe_general_${cliente.nombre.replace(/\s/g, '_')}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Informe General del Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Título del informe</label>
            <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-sm">
            <p className="text-muted-foreground">Fecha: {fecha}</p>
            <p className="text-muted-foreground">Cliente: <span className="text-foreground font-medium">{cliente.nombre}</span></p>
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

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Propiedad', 'Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado'].map(h => (
                      <th key={h} className="text-left px-2 py-1.5 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allData.slice(0, 6).map(h => (
                    <tr key={h.id} className="border-b border-border/50">
                      <td className="px-2 py-1.5">{h.propiedad}</td>
                      <td className="px-2 py-1.5 font-mono">{h.periodo}</td>
                      <td className="px-2 py-1.5">{conceptoLabels[h.concepto]}</td>
                      <td className="px-2 py-1.5">{formatCurrency(h.valor_cobrado)}</td>
                      <td className="px-2 py-1.5">{formatCurrency(h.valor_pagado)}</td>
                      <td className="px-2 py-1.5">{estadoPagoLabels[h.estado_pago]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allData.length > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-1">... y {allData.length - 6} registros más</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Notas adicionales (opcional)</label>
            <Textarea value={notasExtra} onChange={e => setNotasExtra(e.target.value)} placeholder="Agrega observaciones..." rows={3} />
          </div>

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
