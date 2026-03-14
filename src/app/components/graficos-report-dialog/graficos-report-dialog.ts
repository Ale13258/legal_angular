import { Component, input, output } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-graficos-report-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div class="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <h2 class="font-display text-xl font-bold">Informe de Gráficos y Analítica</h2>
          <button
            type="button"
            (click)="openChange.emit(false)"
            class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div class="text-sm text-muted-foreground">
            <p><strong class="text-foreground">Fecha:</strong> {{ fecha }}</p>
            <p><strong class="text-foreground">Visión general de toda la cartera</strong></p>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="bg-muted/50 rounded-xl p-4 text-center border border-border/50">
              <p class="text-xs text-muted-foreground uppercase mb-1">Cartera Total</p>
              <p class="font-bold text-foreground">{{ data.formatCurrency(totalCartera()) }}</p>
            </div>
            <div class="bg-muted/50 rounded-xl p-4 text-center border border-border/50">
              <p class="text-xs text-muted-foreground uppercase mb-1">Clientes</p>
              <p class="font-bold text-foreground">{{ clientesCount() }}</p>
            </div>
            <div class="rounded-xl p-4 text-center border-2 border-primary/30 bg-primary/5">
              <p class="text-xs text-muted-foreground uppercase mb-1">Propiedades</p>
              <p class="font-bold text-primary">{{ propiedadesCount() }}</p>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Distribución por Estado</h3>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Cuentas</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of estadoTable(); track row.estado) {
                    <tr class="border-b border-border/50">
                      <td class="px-3 py-2">{{ row.label }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ row.cantidad }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Distribución por Tipo</h3>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Tipo</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Cuentas</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of tipoTable(); track row.tipo) {
                    <tr class="border-b border-border/50">
                      <td class="px-3 py-2">{{ row.label }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ row.cantidad }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Cobrado vs Pagado por Periodo</h3>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Periodo</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Cobrado</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of periodoTable(); track row.periodo) {
                    <tr class="border-b border-border/50">
                      <td class="px-3 py-2 font-mono">{{ row.periodo }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(row.cobrado) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(row.pagado) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              (click)="downloadPdf()"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:opacity-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
              Descargar PDF
            </button>
            <button
              type="button"
              (click)="downloadExcel()"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary text-primary px-4 py-3 text-sm font-medium hover:bg-primary/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9h4"/></svg>
              Descargar Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GraficosReportDialog {
  open = input<boolean>(true);
  openChange = output<boolean>();

  fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  totalCartera = (): number => this.data.getTotalCartera();
  clientesCount = (): number => this.data.mockClientes.length;
  propiedadesCount = (): number => this.data.mockPropiedades.length;

  estadoTable(): { estado: string; label: string; cantidad: number }[] {
    const counts = this.data.mockCuentas.reduce<Record<string, number>>((acc, c) => {
      acc[c.estado] = (acc[c.estado] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([estado, cantidad]) => ({
      estado,
      label: this.data.estadoCuentaLabels[estado] ?? estado,
      cantidad,
    }));
  }

  tipoTable(): { tipo: string; label: string; cantidad: number }[] {
    const counts = this.data.mockCuentas.reduce<Record<string, number>>((acc, c) => {
      acc[c.tipo] = (acc[c.tipo] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([tipo, cantidad]) => ({
      tipo,
      label: this.data.tipoCuentaLabels[tipo] ?? tipo,
      cantidad,
    }));
  }

  periodoTable(): { periodo: string; cobrado: number; pagado: number }[] {
    const periodos = [...new Set(this.data.mockHistorial.map((h) => h.periodo))].sort();
    return periodos.map((periodo) => {
      const items = this.data.mockHistorial.filter((h) => h.periodo === periodo);
      const cobrado = items.reduce((s, h) => s + h.valor_cobrado, 0);
      const pagado = items.reduce((s, h) => s + h.valor_pagado, 0);
      return { periodo, cobrado, pagado };
    });
  }

  constructor(protected data: DataService) {}

  downloadPdf(): void {
    const doc = new jsPDF();
    const titulo = 'Informe de Gráficos y Analítica';
    doc.setFontSize(16);
    doc.text(titulo, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${this.fecha}`, 14, 28);
    doc.text('Visión general de toda la cartera', 14, 34);
    doc.setFontSize(11);
    doc.text('Resumen', 14, 44);
    doc.setFontSize(10);
    doc.text(`Cartera Total: ${this.data.formatCurrency(this.totalCartera())}`, 14, 51);
    doc.text(`Clientes: ${this.clientesCount()}`, 14, 57);
    doc.text(`Propiedades: ${this.propiedadesCount()}`, 14, 63);

    const estadoRows = this.estadoTable();
    let startY = 72;
    doc.setFontSize(11);
    doc.text('Distribución por Estado', 14, startY);
    startY += 6;
    autoTable(doc, {
      startY,
      head: [['Estado', 'Cuentas']],
      body: estadoRows.map((r) => [r.label, String(r.cantidad)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [107, 60, 200] },
    });
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.text('Distribución por Tipo', 14, startY);
    startY += 6;
    const tipoRows = this.tipoTable();
    autoTable(doc, {
      startY,
      head: [['Tipo', 'Cuentas']],
      body: tipoRows.map((r) => [r.label, String(r.cantidad)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [107, 60, 200] },
    });
    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.text('Cobrado vs Pagado por Periodo', 14, startY);
    startY += 6;
    const periodoRows = this.periodoTable();
    autoTable(doc, {
      startY,
      head: [['Periodo', 'Cobrado', 'Pagado']],
      body: periodoRows.map((r) => [
        r.periodo,
        this.data.formatCurrency(r.cobrado),
        this.data.formatCurrency(r.pagado),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [107, 60, 200] },
    });

    doc.save(`informe_graficos_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  downloadExcel(): void {
    const estadoRows = this.estadoTable();
    const tipoRows = this.tipoTable();
    const periodoRows = this.periodoTable();
    const wsData: (string | number)[][] = [
      ['Informe de Gráficos y Analítica'],
      [`Fecha: ${this.fecha}`],
      ['Visión general de toda la cartera'],
      [],
      ['Cartera Total', this.data.formatCurrency(this.totalCartera())],
      ['Clientes', this.clientesCount()],
      ['Propiedades', this.propiedadesCount()],
      [],
      ['Distribución por Estado'],
      ['Estado', 'Cuentas'],
      ...estadoRows.map((r) => [r.label, r.cantidad]),
      [],
      ['Distribución por Tipo'],
      ['Tipo', 'Cuentas'],
      ...tipoRows.map((r) => [r.label, r.cantidad]),
      [],
      ['Cobrado vs Pagado por Periodo'],
      ['Periodo', 'Cobrado', 'Pagado'],
      ...periodoRows.map((r) => [r.periodo, r.cobrado, r.pagado]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    (ws as unknown as { '!cols': { wch: number }[] })['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gráficos');
    XLSX.writeFile(wb, `informe_graficos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
