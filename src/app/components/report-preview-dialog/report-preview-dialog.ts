import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { Propiedad } from '../../core/models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-report-preview-dialog',
  standalone: true,
  imports: [],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-auto">
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
            <p><strong class="text-foreground">Propiedad:</strong> {{ propiedad().identificador }} – {{ propiedad().direccion }}</p>
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
                      <td class="px-3 py-2 text-muted-foreground">{{ h.fecha_pago || '—' }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(h.monto_a_la_fecha) }}</td>
                    </tr>
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
export class ReportPreviewDialog {
  open = input<boolean>(true);
  propiedad = input.required<Propiedad>();
  openChange = output<boolean>();

  titulo = signal('');
  notasExtra = signal('');

  fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  historial = computed(() =>
    this.data.getHistorialByPropiedad(this.propiedad().id)
  );
  clienteNombre = computed(() => {
    const cl = this.data.getClienteById(this.propiedad().cliente_id);
    return cl?.nombre ?? '';
  });
  totalCobrado = computed(() => this.saldo());
  totalPagado = computed(() =>
    this.historial().reduce((s, h) => s + this.toNumber(h.valor_pagado), 0)
  );
  saldo = computed(() => {
    const deuda = this.toNumber(this.propiedad().monto_a_la_fecha);
    return deuda > 0 ? deuda : 0;
  });

  resumenCobroUnidad = computed(() => this.data.getResumenMoraCobroParaPropiedad(this.propiedad()));

  constructor(protected data: DataService) {
    effect(() => {
      const p = this.propiedad();
      if (p?.identificador) this.titulo.set(`Informe de Cartera - ${p.identificador}`);
    });
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  downloadPdf(): void {
    const p = this.propiedad();
    const tituloDoc = this.titulo() || `Informe de Cartera — ${p.identificador}`;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(tituloDoc, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${this.fecha}`, 14, 28);
    doc.text(`Cliente: ${this.clienteNombre()}`, 14, 34);
    doc.text(`Propiedad: ${p.identificador} — ${p.direccion}`, 14, 40);
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
    doc.text(`Inicio del cobro: ${this.data.formatFechaCorta(rc.fecha_inicio_cobro)}`, 14, 90);
    doc.text(`Fin del cobro: ${this.data.formatFechaCorta(rc.fecha_fin_cobro)}`, 14, 96);
    const notas = this.notasExtra()?.trim();
    let startY = 106;
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
        h.fecha_pago || '—',
        this.data.formatCurrency(h.monto_a_la_fecha),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [107, 60, 200] },
    });
    doc.save(`informe_${p.identificador.replace(/\s/g, '_')}.pdf`);
  }

  downloadExcel(): void {
    const p = this.propiedad();
    const tituloDoc = this.titulo() || `Informe de Cartera — ${p.identificador}`;
    const historial = this.historial();
    const notas = this.notasExtra()?.trim();
    const wsData: (string | number)[][] = [
      [tituloDoc],
      [`Fecha: ${this.fecha}`],
      [`Cliente: ${this.clienteNombre()}`],
      [`Propiedad: ${p.identificador} — ${p.direccion}`],
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
        h.fecha_pago || '—',
        h.monto_a_la_fecha,
      ]),
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
}
