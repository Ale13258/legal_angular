import { Component, input, output } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  buildHeading,
  buildKeyValueLines,
  buildParagraph,
  buildSpacer,
  buildSubheading,
  buildTable,
  saveDocx,
} from '../../core/report-export/report-docx';
import { pickClienteMasAntiguo, type MoraPorClienteRow } from '../../core/mora-por-cliente';

@Component({
  selector: 'app-graficos-report-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div class="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <h2 class="font-display text-xl font-bold">Informe de analítica de cartera</h2>
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
            <h3 class="text-sm font-semibold text-foreground mb-2">Mora y antigüedad por cliente</h3>
            @if (clienteMasAntiguo(); as viejo) {
              <p class="text-sm text-muted-foreground mb-2">
                Cliente más antiguo: <strong class="text-foreground">{{ viejo.nombre }}</strong>
                ({{ data.formatDiasMora(viejo.antiguedad_dias) }} en la cartera)
              </p>
            }
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Cliente</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">% de mora</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Deuda</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Edad en mora</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Antigüedad</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of moraTable(); track row.cliente_id) {
                    <tr class="border-b border-border/50">
                      <td class="px-3 py-2">{{ row.nombre }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatPorcentaje(row.porcentaje_mora) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(row.deuda) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatDiasMora(row.edad_mora_dias) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatDiasMora(row.antiguedad_dias) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              (click)="downloadPdf()"
              class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:opacity-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
              Descargar PDF
            </button>
            <button
              type="button"
              (click)="downloadExcel()"
              class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary text-primary px-4 py-3 text-sm font-medium hover:bg-primary/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9h4"/></svg>
              Descargar Excel
            </button>
            <button
              type="button"
              (click)="downloadWord()"
              class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary text-primary px-4 py-3 text-sm font-medium hover:bg-primary/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
              Descargar Word
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
  propiedadesCount = (): number => this.data.mockCuentas.length;

  estadoTable(): { estado: string; label: string; cantidad: number }[] {
    const counts =
      this.data.mockProcesosLegales.length > 0
        ? this.data.mockProcesosLegales.reduce<Record<string, number>>((acc, c) => {
            const label = this.data.estadoProcesoLegalLabels[c.estado] ?? c.estado;
            acc[label] = (acc[label] ?? 0) + 1;
            return acc;
          }, {})
        : this.data.mockCuentas.reduce<Record<string, number>>((acc, p) => {
            const label = this.data.getDeudaActualParaCuenta(p) > 0 ? 'Con deuda' : 'Saldada';
            acc[label] = (acc[label] ?? 0) + 1;
            return acc;
          }, {});

    return Object.entries(counts).map(([estado, cantidad]) => ({
      estado,
      label: estado,
      cantidad,
    }));
  }

  tipoTable(): { tipo: string; label: string; cantidad: number }[] {
    const counts = this.data.mockCuentas.reduce<Record<string, number>>((acc, p) => {
      const label = this.data.tipoCuentaLabels[p.tipo_cuenta] ?? p.tipo_cuenta;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([tipo, cantidad]) => ({
      tipo,
      label: tipo,
      cantidad,
    }));
  }

  moraTable(): MoraPorClienteRow[] {
    return this.data.getMoraPorCliente();
  }

  clienteMasAntiguo(): MoraPorClienteRow | null {
    return pickClienteMasAntiguo(this.moraTable());
  }

  constructor(protected data: DataService) {}

  downloadPdf(): void {
    const doc = new jsPDF();
    const titulo = 'Informe de analítica de cartera';
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
    doc.text('Mora y antigüedad por cliente', 14, startY);
    startY += 6;
    const moraRows = this.moraTable();
    const viejo = this.clienteMasAntiguo();
    if (viejo) {
      doc.setFontSize(10);
      doc.text(
        `Cliente más antiguo: ${viejo.nombre} (${this.data.formatDiasMora(viejo.antiguedad_dias)})`,
        14,
        startY,
      );
      startY += 6;
    }
    autoTable(doc, {
      startY,
      head: [['Cliente', '% de mora', 'Deuda', 'Edad en mora', 'Antigüedad']],
      body: moraRows.map((r) => [
        r.nombre,
        this.data.formatPorcentaje(r.porcentaje_mora),
        this.data.formatCurrency(r.deuda),
        this.data.formatDiasMora(r.edad_mora_dias),
        this.data.formatDiasMora(r.antiguedad_dias),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [107, 60, 200] },
    });

    doc.save(`informe_graficos_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  downloadExcel(): void {
    const estadoRows = this.estadoTable();
    const tipoRows = this.tipoTable();
    const moraRows = this.moraTable();
    const viejo = this.clienteMasAntiguo();
    const wsData: (string | number)[][] = [
      ['Informe de analítica de cartera'],
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
      ['Mora y antigüedad por cliente'],
      ...(viejo
        ? [['Cliente más antiguo', viejo.nombre, this.data.formatDiasMora(viejo.antiguedad_dias)]]
        : []),
      ['Cliente', '% de mora', 'Deuda', 'Edad en mora', 'Antigüedad'],
      ...moraRows.map((r) => [
        r.nombre,
        r.porcentaje_mora,
        r.deuda,
        r.edad_mora_dias ?? '—',
        r.antiguedad_dias,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    (ws as unknown as { '!cols': { wch: number }[] })['!cols'] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informes');
    XLSX.writeFile(wb, `informe_graficos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async downloadWord(): Promise<void> {
    const estadoRows = this.estadoTable();
    const tipoRows = this.tipoTable();
    const moraRows = this.moraTable();
    const viejo = this.clienteMasAntiguo();
    const titulo = 'Informe de analítica de cartera';

    const children = [
      buildHeading(titulo),
      buildParagraph(`Fecha: ${this.fecha}`),
      buildParagraph('Visión general de toda la cartera'),
      buildSubheading('Resumen'),
      ...buildKeyValueLines([
        ['Cartera Total', this.data.formatCurrency(this.totalCartera())],
        ['Clientes', String(this.clientesCount())],
        ['Propiedades', String(this.propiedadesCount())],
      ]),
      buildSpacer(),
      buildSubheading('Distribución por Estado'),
      buildTable(
        ['Estado', 'Cuentas'],
        estadoRows.map((r) => [r.label, String(r.cantidad)])
      ),
      buildSpacer(),
      buildSubheading('Distribución por Tipo'),
      buildTable(
        ['Tipo', 'Cuentas'],
        tipoRows.map((r) => [r.label, String(r.cantidad)])
      ),
      buildSpacer(),
      buildSubheading('Mora y antigüedad por cliente'),
      ...(viejo
        ? [
            buildParagraph(
              `Cliente más antiguo: ${viejo.nombre} (${this.data.formatDiasMora(viejo.antiguedad_dias)})`,
            ),
          ]
        : []),
      buildTable(
        ['Cliente', '% de mora', 'Deuda', 'Edad en mora', 'Antigüedad'],
        moraRows.map((r) => [
          r.nombre,
          this.data.formatPorcentaje(r.porcentaje_mora),
          this.data.formatCurrency(r.deuda),
          this.data.formatDiasMora(r.edad_mora_dias),
          this.data.formatDiasMora(r.antiguedad_dias),
        ])
      ),
    ];

    await saveDocx(
      `informe_graficos_${new Date().toISOString().slice(0, 10)}.docx`,
      children
    );
  }
}
