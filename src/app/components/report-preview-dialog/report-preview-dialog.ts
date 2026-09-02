import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { HistorialPago, Cuenta } from '../../core/models';
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
import {
  buildGestionExportRows,
  GESTION_EXPORT_HEADERS,
} from '../../core/report-export/gestion-report';

@Component({
  selector: 'app-report-preview-dialog',
  standalone: true,
  imports: [],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div
        class="relative z-50 bg-card rounded-2xl shadow-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header con título y cerrar -->
        <div class="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <h2 class="font-display text-xl font-bold">Editar y Descargar Informe</h2>
          <button
            type="button"
            (click)="openChange.emit(false)"
            class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div class="p-6 space-y-5">
          <!-- Título del informe -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Título del informe</label>
            <input
              type="text"
              [value]="titulo()"
              (input)="titulo.set($any($event.target).value)"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Metadata -->
          <div class="text-sm text-muted-foreground space-y-1">
            <p><strong class="text-foreground">Fecha:</strong> {{ fecha }}</p>
            <p><strong class="text-foreground">Cliente:</strong> {{ clienteNombre() }}</p>
            <p><strong class="text-foreground">Cuenta:</strong> {{ cuenta().identificador }} – {{ cuenta().direccion }}</p>
          </div>

        
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-muted/50 rounded-xl p-4 text-center">
              <p class="text-xs text-muted-foreground mb-1">Cobrado</p>
              <p class="font-bold text-foreground">{{ data.formatCurrency(totalCobrado()) }}</p>
            </div>
            <div class="bg-muted/50 rounded-xl p-4 text-center">
              <p class="text-xs text-muted-foreground mb-1">Pagado</p>
              <p class="font-bold text-foreground">{{ data.formatCurrency(totalPagado()) }}</p>
            </div>
            <div class="rounded-xl p-4 text-center border-2 border-primary/30 bg-primary/5">
              <p class="text-xs text-muted-foreground mb-1">Deuda a la fecha</p>
              <p class="font-bold text-primary">{{ data.formatCurrency(saldo()) }}</p>
            </div>
          </div>

          <div class="rounded-xl border border-border p-4 text-sm space-y-1">
            <p class="font-semibold text-foreground mb-2">Cobro de esta unidad</p>
            <p><strong class="text-muted-foreground">Edad en mora:</strong> {{ data.formatDiasMora(resumenCobroUnidad().edad_mora_dias) }}</p>
            <p class="text-foreground">
              <strong class="text-muted-foreground">Etapa de cobranza:</strong>
              {{ data.formatEtapaCobranza(resumenCobroUnidad().edad_mora_dias) }}
            </p>
            <p><strong class="text-muted-foreground">Inicio del cobro:</strong> {{ data.formatFechaCorta(resumenCobroUnidad().fecha_inicio_cobro) }}</p>
            <p><strong class="text-muted-foreground">Fin del cobro:</strong> {{ data.formatFechaCorta(resumenCobroUnidad().fecha_fin_cobro) }}</p>
          </div>

          <!-- Detalle de pagos (igual que en el informe) -->
          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Detalle de pagos</h3>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Periodo</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Concepto</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Valor Cobrado</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Valor Pagado</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Fecha Pago</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Deuda a la fecha</th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of historial(); track h.id) {
                    <tr class="border-b border-border/50">
                      <td class="px-3 py-2 font-mono">{{ h.periodo }}</td>
                      <td class="px-3 py-2">{{ data.conceptoLabels[h.concepto] }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(h.valor_cobrado) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(h.valor_pagado) }}</td>
                      <td class="px-3 py-2">{{ data.estadoPagoLabels[h.estado_pago] }}</td>
                      <td class="px-3 py-2 text-muted-foreground">{{ data.formatFechaPago(h) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatDeuda(deudaHistorial(h)) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Trazabilidad de cobro</h3>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Fecha</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Tipo</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  @if (gestiones().length === 0) {
                    <tr>
                      <td colspan="4" class="px-3 py-4 text-sm text-muted-foreground">
                        No hay trazabilidad de cobro registrada en esta unidad.
                      </td>
                    </tr>
                  } @else {
                    @for (g of gestiones(); track g.id) {
                      <tr class="border-b border-border/50">
                        <td class="px-3 py-2 text-muted-foreground whitespace-nowrap">{{ data.formatGestionFecha(g) }}</td>
                        <td class="px-3 py-2">{{ data.formatGestionEstadoLabel(g) }}</td>
                        <td class="px-3 py-2">{{ data.formatGestionTipo(g) }}</td>
                        <td class="px-3 py-2">{{ data.getGestionDescripcion(g) || '—' }}</td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Notas adicionales (opcional) -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Notas adicionales (opcional)</label>
            <textarea
              [value]="notasExtra()"
              (input)="notasExtra.set($any($event.target).value)"
              placeholder="Agrega observaciones al informe..."
              rows="3"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            ></textarea>
          </div>

          <!-- Botones Descargar -->
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
export class ReportPreviewDialog {
  open = input<boolean>(true);
  cuenta = input.required<Cuenta>();
  openChange = output<boolean>();

  titulo = signal('');
  notasExtra = signal('');

  fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  historial = computed(() =>
    this.data.getHistorialByCuenta(this.cuenta().id)
  );
  gestiones = computed(() => this.data.getGestionesByCuenta(this.cuenta().id));
  clienteNombre = computed(() => {
    const cl = this.data.getClienteById(this.cuenta().cliente_id);
    return cl?.nombre ?? '';
  });
  totalCobrado = computed(() => this.data.getTotalCobradoParaCuenta(this.cuenta()));
  totalPagado = computed(() =>
    this.historial().reduce((s, h) => s + this.toNumber(h.valor_pagado), 0)
  );
  saldo = computed(() => this.data.getDeudaActualParaCuenta(this.cuenta()));

  resumenCobroUnidad = computed(() => this.data.getResumenMoraCobroParaCuenta(this.cuenta()));

  private lastSyncedCuentaKey: string | null = null;

  constructor(protected data: DataService) {
    effect(() => {
      if (!this.open()) {
        this.lastSyncedCuentaKey = null;
        return;
      }
      const p = this.cuenta();
      const key = p.id;
      if (this.lastSyncedCuentaKey === key) return;
      this.lastSyncedCuentaKey = key;

      if (p.identificador) this.titulo.set(`Informe de Cartera - ${p.identificador}`);
      // Desde la ficha del cliente no se precarga el historial ni las gestiones.
      void Promise.all([
        this.data.loadHistorialByCuenta(p.id),
        this.data.loadGestionesByCuenta(p.id),
      ]);
    });
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  deudaHistorial(h: HistorialPago): number {
    return this.data.getDeudaParaHistorialPago(this.cuenta(), h);
  }

  downloadPdf(): void {
    const p = this.cuenta();
    const tituloDoc = this.titulo() || `Informe de Cartera — ${p.identificador}`;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(tituloDoc, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${this.fecha}`, 14, 28);
    doc.text(`Cliente: ${this.clienteNombre()}`, 14, 34);
    doc.text(`Cuenta: ${p.identificador} — ${p.direccion}`, 14, 40);
    doc.setFontSize(11);
    doc.text('Resumen Financiero', 14, 52);
    doc.setFontSize(10);
    doc.text(
      `Total Cobrado: ${this.data.formatCurrency(this.totalCobrado())}`,
      14,
      59
    );
    doc.text(
      `Total Pagado: ${this.data.formatCurrency(this.totalPagado())}`,
      14,
      65
    );
    doc.setFont(undefined as unknown as string, 'bold');
    doc.text(
      `Deuda a la fecha: ${this.data.formatCurrency(this.saldo())}`,
      14,
      71
    );
    doc.setFont(undefined as unknown as string, 'normal');
    const rc = this.resumenCobroUnidad();
    doc.text('Cobro de esta unidad', 14, 78);
    doc.text(`Edad en mora: ${this.data.formatDiasMora(rc.edad_mora_dias)}`, 14, 84);
    const etapaLines = doc.splitTextToSize(
      `Etapa de cobranza: ${this.data.formatEtapaCobranza(rc.edad_mora_dias)}`,
      180
    );
    doc.text(etapaLines, 14, 90);
    let yAfterEtapa = 90 + etapaLines.length * 5;
    doc.text(`Inicio del cobro: ${this.data.formatFechaCorta(rc.fecha_inicio_cobro)}`, 14, yAfterEtapa);
    yAfterEtapa += 6;
    doc.text(`Fin del cobro: ${this.data.formatFechaCorta(rc.fecha_fin_cobro)}`, 14, yAfterEtapa);
    const notas = this.notasExtra()?.trim();
    let startY = yAfterEtapa + 10;
    if (notas) {
      doc.setFontSize(10);
      doc.text('Notas:', 14, startY);
      startY += 6;
      const lines = doc.splitTextToSize(notas, 180);
      doc.text(lines, 14, startY);
      startY += lines.length * 5 + 8;
    }
    const historial = this.historial();
    autoTable(doc, {
      startY,
      head: [
        [
          'Periodo',
          'Concepto',
          'Valor Cobrado',
          'Valor Pagado',
          'Estado',
          'Fecha Pago',
          'Deuda a la fecha',
        ],
      ],
      body: historial.map((h) => [
        h.periodo,
        this.data.conceptoLabels[h.concepto],
        this.data.formatCurrency(h.valor_cobrado),
        this.data.formatCurrency(h.valor_pagado),
        this.data.estadoPagoLabels[h.estado_pago],
        this.data.formatFechaPago(h),
        this.data.formatDeuda(this.data.getDeudaParaHistorialPago(p, h)),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [107, 60, 200] },
    });
    const docLt = doc as unknown as { lastAutoTable?: { finalY: number } };
    let yGestiones = (docLt.lastAutoTable?.finalY ?? startY) + 10;
    doc.setFontSize(11);
    doc.text('Trazabilidad de cobro', 14, yGestiones);
    const gestionRows = buildGestionExportRows(this.data, p.id);
    if (gestionRows.length === 0) {
      doc.setFontSize(10);
      doc.text('No hay trazabilidad de cobro registrada en esta unidad.', 14, yGestiones + 6);
    } else {
      autoTable(doc, {
        startY: yGestiones + 4,
        head: [[...GESTION_EXPORT_HEADERS]],
        body: gestionRows,
        styles: { fontSize: 8, overflow: 'linebreak' },
        columnStyles: { 3: { cellWidth: 80 } },
        headStyles: { fillColor: [107, 60, 200] },
      });
    }
    doc.save(`informe_${p.identificador.replace(/\s/g, '_')}.pdf`);
  }

  downloadExcel(): void {
    const p = this.cuenta();
    const tituloDoc = this.titulo() || `Informe de Cartera — ${p.identificador}`;
    const historial = this.historial();
    const notas = this.notasExtra()?.trim();
    const gestionRows = buildGestionExportRows(this.data, p.id);
    const wsData: (string | number)[][] = [
      [tituloDoc],
      [`Fecha: ${this.fecha}`],
      [`Cliente: ${this.clienteNombre()}`],
      [`Cuenta: ${p.identificador} — ${p.direccion}`],
      [],
      ['Total Cobrado', this.data.formatCurrency(this.totalCobrado())],
      ['Total Pagado', this.data.formatCurrency(this.totalPagado())],
      ['Deuda a la fecha', this.data.formatCurrency(this.saldo())],
      [],
      ['Cobro de esta unidad'],
      [
        'Edad en mora',
        this.data.formatDiasMora(this.resumenCobroUnidad().edad_mora_dias),
      ],
      ['Etapa de cobranza', this.data.formatEtapaCobranza(this.resumenCobroUnidad().edad_mora_dias)],
      [
        'Inicio del cobro',
        this.data.formatFechaCorta(this.resumenCobroUnidad().fecha_inicio_cobro),
      ],
      ['Fin del cobro', this.data.formatFechaCorta(this.resumenCobroUnidad().fecha_fin_cobro)],
      ...(notas ? [[], ['Notas', notas], []] : []),
      [],
      [
        'Periodo',
        'Concepto',
        'Valor Cobrado',
        'Valor Pagado',
        'Estado',
        'Fecha Pago',
        'Deuda a la fecha',
      ],
      ...historial.map((h) => [
        h.periodo,
        this.data.conceptoLabels[h.concepto],
        h.valor_cobrado,
        h.valor_pagado,
        this.data.estadoPagoLabels[h.estado_pago],
        this.data.formatFechaPago(h),
        this.data.getDeudaParaHistorialPago(p, h),
      ]),
      [],
      ['Trazabilidad de cobro'],
      [...GESTION_EXPORT_HEADERS],
      ...(gestionRows.length
        ? gestionRows
        : [['No hay trazabilidad de cobro registrada en esta unidad.', '', '', '']]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    (ws as unknown as { '!cols': { wch: number }[] })['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe');
    XLSX.writeFile(wb, `informe_${p.identificador.replace(/\s/g, '_')}.xlsx`);
  }

  async downloadWord(): Promise<void> {
    const p = this.cuenta();
    const tituloDoc = this.titulo() || `Informe de Cartera — ${p.identificador}`;
    const historial = this.historial();
    const notas = this.notasExtra()?.trim();
    const rc = this.resumenCobroUnidad();
    const gestionRows = buildGestionExportRows(this.data, p.id);

    const children = [
      buildHeading(tituloDoc),
      buildParagraph(`Fecha: ${this.fecha}`),
      buildParagraph(`Cliente: ${this.clienteNombre()}`),
      buildParagraph(`Cuenta: ${p.identificador} — ${p.direccion}`),
      buildSubheading('Resumen Financiero'),
      ...buildKeyValueLines([
        ['Total Cobrado', this.data.formatCurrency(this.totalCobrado())],
        ['Total Pagado', this.data.formatCurrency(this.totalPagado())],
        ['Deuda a la fecha', this.data.formatCurrency(this.saldo())],
      ]),
      buildSubheading('Cobro de esta unidad'),
      ...buildKeyValueLines([
        ['Edad en mora', this.data.formatDiasMora(rc.edad_mora_dias)],
        ['Etapa de cobranza', this.data.formatEtapaCobranza(rc.edad_mora_dias)],
        ['Inicio del cobro', this.data.formatFechaCorta(rc.fecha_inicio_cobro)],
        ['Fin del cobro', this.data.formatFechaCorta(rc.fecha_fin_cobro)],
      ]),
      ...(notas
        ? [buildSubheading('Notas'), buildParagraph(notas), buildSpacer()]
        : [buildSpacer()]),
      buildTable(
        [
          'Periodo',
          'Concepto',
          'Valor Cobrado',
          'Valor Pagado',
          'Estado',
          'Fecha Pago',
          'Deuda a la fecha',
        ],
        historial.map((h) => [
          h.periodo,
          this.data.conceptoLabels[h.concepto],
          this.data.formatCurrency(h.valor_cobrado),
          this.data.formatCurrency(h.valor_pagado),
          this.data.estadoPagoLabels[h.estado_pago],
          this.data.formatFechaPago(h),
          this.data.formatDeuda(this.data.getDeudaParaHistorialPago(p, h)),
        ])
      ),
      buildSpacer(),
      buildSubheading('Trazabilidad de cobro'),
      ...(gestionRows.length
        ? [buildTable([...GESTION_EXPORT_HEADERS], gestionRows)]
        : [buildParagraph('No hay trazabilidad de cobro registrada en esta unidad.')]),
    ];

    await saveDocx(`informe_${p.identificador.replace(/\s/g, '_')}.docx`, children);
  }
}
