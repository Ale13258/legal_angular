import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { Cliente, Cuenta } from '../../core/models';
import { DeudorCell } from '../../shared/deudor-cell/deudor-cell';
import * as XLSX from 'xlsx';
import {
  buildClientReportResumenRows,
  downloadClientGeneralReportPdf,
  resumenCuentaPdfRow,
} from '../../core/report-export/client-general-report-pdf';
import {
  buildUnidadGestionExportRows,
  GESTION_EXPORT_HEADERS_CON_UNIDAD,
} from '../../core/report-export/gestion-report';
import {
  buildHeading,
  buildKeyValueLines,
  buildParagraph,
  buildSpacer,
  buildSubheading,
  buildTable,
  saveDocx,
} from '../../core/report-export/report-docx';

@Component({
  selector: 'app-client-report-dialog',
  standalone: true,
  imports: [DeudorCell],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div
        class="relative z-50 bg-card rounded-2xl shadow-lg border border-border max-w-5xl w-full max-h-[90vh] overflow-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <h2 class="font-display text-xl font-bold text-foreground">Informe General del Cliente</h2>
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
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Título del informe</label>
            <input
              type="text"
              [value]="titulo()"
              (input)="titulo.set($any($event.target).value)"
              class="w-full rounded-xl border-2 border-primary/30 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div class="text-sm text-muted-foreground space-y-1">
            <p><strong class="text-foreground">Fecha:</strong> {{ fecha }}</p>
            <p><strong class="text-foreground">Cliente:</strong> {{ cliente().nombre }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="min-w-0 rounded-xl border border-border/50 bg-muted/50 p-4">
              <p class="text-xs text-muted-foreground mb-1 text-center">Cobrado</p>
              <p class="font-bold tabular-nums text-foreground text-center text-lg leading-tight break-words">
                {{ data.formatCurrency(totalCobrado()) }}
              </p>
            </div>
            <div class="min-w-0 rounded-xl border border-border/50 bg-muted/50 p-4">
              <p class="text-xs text-muted-foreground mb-1 text-center">Pagado</p>
              <p class="font-bold tabular-nums text-foreground text-center text-lg leading-tight break-words">
                {{ data.formatCurrency(totalPagado()) }}
              </p>
            </div>
            <div class="min-w-0 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
              <p class="text-xs text-muted-foreground mb-1 text-center">Deuda a la fecha</p>
              <p class="font-bold tabular-nums text-primary text-center text-lg leading-tight break-words">
                {{ data.formatCurrency(saldo()) }}
              </p>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Por cuenta (unidad)</h3>
            <p class="text-xs text-muted-foreground mb-2">
              Deudor actualizado por unidad. Pasa el cursor sobre Deudor para ver todos los deudores, documentos y correos.
            </p>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Unidad</th>
                    <th class="deudor-col text-left px-3 py-2 font-semibold text-muted-foreground">Deudor</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Documento</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Correo</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Edad en mora</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Deuda a la fecha</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of resumenPorCuenta(); track row.identificador) {
                    <tr class="border-b border-border/50">
                      <td class="px-3 py-2 font-medium align-top">{{ row.identificador }}</td>
                      <td class="deudor-col px-3 py-2 align-top max-w-[11rem]">
                        <app-deudor-cell [cuenta]="row.cuenta" />
                      </td>
                      <td class="px-3 py-2 text-muted-foreground align-top whitespace-nowrap">
                        {{ row.documentoLabel }}
                      </td>
                      <td class="px-3 py-2 text-muted-foreground align-top max-w-[12rem]">
                        <div class="truncate" [title]="row.correo">{{ row.correo }}</div>
                      </td>
                      <td
                        class="px-3 py-2 text-right align-top max-w-[14rem]"
                        [title]="data.formatResumenMoraTooltip(row)"
                      >
                        <div class="font-medium tabular-nums text-foreground">
                          {{ data.formatDiasMora(row.edad_mora_dias) }}
                        </div>
                        <div class="text-xs text-muted-foreground mt-1 leading-snug">
                          {{ data.formatEtapaCobranzaCorta(row.edad_mora_dias) }}
                        </div>
                      </td>
                      <td class="px-3 py-2 text-right tabular-nums font-semibold align-top whitespace-nowrap">
                        {{ data.formatDeuda(row.deuda) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Detalle de transacciones</h3>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Cuenta</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Periodo</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Concepto</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Cobrado</th>
                    <th class="text-right px-3 py-2 font-semibold text-muted-foreground">Pagado</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of allData(); track h.id) {
                    <tr class="border-b border-border/50">
                      <td class="px-3 py-2">{{ h.cuenta }}</td>
                      <td class="px-3 py-2 font-mono">{{ h.periodo }}</td>
                      <td class="px-3 py-2">{{ data.conceptoLabels[h.concepto] }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(h.valor_cobrado) }}</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ data.formatCurrency(h.valor_pagado) }}</td>
                      <td class="px-3 py-2">{{ data.estadoPagoLabels[h.estado_pago] }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Trazabilidad de cobro por unidad</h3>
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Unidad</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Fecha</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Tipo</th>
                    <th class="text-left px-3 py-2 font-semibold text-muted-foreground">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  @if (gestionesPorUnidad().length === 0) {
                    <tr>
                      <td colspan="5" class="px-3 py-4 text-sm text-muted-foreground">
                        No hay trazabilidad de cobro registrada en las unidades de este cliente.
                      </td>
                    </tr>
                  } @else {
                    @for (row of gestionesPorUnidad(); track $index) {
                      <tr class="border-b border-border/50">
                        <td class="px-3 py-2 font-medium">{{ row[0] }}</td>
                        <td class="px-3 py-2 text-muted-foreground whitespace-nowrap">{{ row[1] }}</td>
                        <td class="px-3 py-2">{{ row[2] }}</td>
                        <td class="px-3 py-2">{{ row[3] }}</td>
                        <td class="px-3 py-2">{{ row[4] }}</td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>

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
export class ClientReportDialog {
  open = input<boolean>(true);
  cliente = input.required<Cliente>();
  cuentas = input.required<Cuenta[]>();
  openChange = output<boolean>();

  titulo = signal('');
  notasExtra = signal('');

  fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  allData = computed(() => {
    const props = this.cuentas();
    return props.flatMap((p) => {
      const hist = this.data.getHistorialByCuenta(p.id);
      return hist.map((h) => ({ ...h, cuenta: p.identificador }));
    });
  });

  totalCobrado = computed(() =>
    this.cuentas().reduce((sum, p) => sum + this.data.getTotalCobradoParaCuenta(p), 0)
  );
  totalPagado = computed(() =>
    this.cuentas().reduce((sum, p) => sum + this.data.getTotalPagadoParaCuenta(p), 0),
  );
  saldo = computed(() =>
    this.cuentas().reduce((sum, p) => sum + this.data.getDeudaActualParaCuenta(p), 0)
  );

  resumenPorCuenta = computed(() =>
    buildClientReportResumenRows(this.data, this.cuentas()),
  );

  gestionesPorUnidad = computed(() =>
    buildUnidadGestionExportRows(this.data, this.cuentas()),
  );

  /** Solo inicializa título/notas al abrir el informe, no en cada refresco de datos del cliente. */
  private lastSyncedClienteKey: string | null = null;

  constructor(protected data: DataService) {
    effect(() => {
      if (!this.open()) {
        this.lastSyncedClienteKey = null;
        return;
      }
      const c = this.cliente();
      const key = c?.id ?? '';
      if (!key || this.lastSyncedClienteKey === key) return;
      this.lastSyncedClienteKey = key;
      if (c.nombre) this.titulo.set(`Informe General – ${c.nombre}`);
      this.notasExtra.set('');
      void this.data.loadGestionesForCuentas(this.cuentas());
    });
  }

  downloadPdf(): void {
    downloadClientGeneralReportPdf({
      data: this.data,
      cliente: this.cliente(),
      cuentas: this.cuentas(),
      titulo: this.titulo(),
      notas: this.notasExtra(),
      fecha: this.fecha,
    });
  }

  downloadExcel(): void {
    const c = this.cliente();
    const tituloDoc = this.titulo() || `Informe General – ${c.nombre}`;
    const allData = this.allData();
    const notas = this.notasExtra()?.trim();
    const resumenRows = this.resumenPorCuenta().map((row) => this.resumenCuentaExportRow(row));
    const gestionRows = this.gestionesPorUnidad();
    const wsData: (string | number)[][] = [
      [tituloDoc],
      [`Fecha: ${this.fecha}`],
      [`Cliente: ${c.nombre}`],
      [],
      ['Total Cobrado', this.data.formatCurrency(this.totalCobrado())],
      ['Total Pagado', this.data.formatCurrency(this.totalPagado())],
      ['Deuda a la fecha', this.data.formatCurrency(this.saldo())],
      ...(notas ? [[], ['Notas', notas], []] : []),
      [],
      ['Por cuenta (unidad)'],
      ['Unidad', 'Deudor', 'Documento', 'Correo', 'Edad en mora', 'Deuda a la fecha'],
      ...resumenRows,
      [],
      ['Detalle de transacciones'],
      [],
      ['Cuenta', 'Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado'],
      ...allData.map((h) => [
        h.cuenta,
        h.periodo,
        this.data.conceptoLabels[h.concepto],
        h.valor_cobrado,
        h.valor_pagado,
        this.data.estadoPagoLabels[h.estado_pago],
      ]),
      [],
      ['Trazabilidad de cobro por unidad'],
      [...GESTION_EXPORT_HEADERS_CON_UNIDAD],
      ...(gestionRows.length
        ? gestionRows
        : [['No hay trazabilidad de cobro registrada en las unidades de este cliente.', '', '', '', '']]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    (ws as unknown as { '!cols': { wch: number }[] })['!cols'] = [
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 40 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe General');
    XLSX.writeFile(
      wb,
      `informe_general_${c.nombre.replace(/\s/g, '_')}.xlsx`
    );
  }

  async downloadWord(): Promise<void> {
    const c = this.cliente();
    const tituloDoc = this.titulo() || `Informe General – ${c.nombre}`;
    const allData = this.allData();
    const notas = this.notasExtra()?.trim();
    const resumen = this.resumenPorCuenta();
    const gestionRows = this.gestionesPorUnidad();

    const children = [
      buildHeading(tituloDoc),
      buildParagraph(`Fecha: ${this.fecha}`),
      buildParagraph(`Cliente: ${c.nombre}`),
      buildSubheading('Resumen Financiero'),
      ...buildKeyValueLines([
        ['Total Cobrado', this.data.formatCurrency(this.totalCobrado())],
        ['Total Pagado', this.data.formatCurrency(this.totalPagado())],
        ['Deuda a la fecha', this.data.formatCurrency(this.saldo())],
      ]),
      ...(notas
        ? [buildSubheading('Notas'), buildParagraph(notas), buildSpacer()]
        : [buildSpacer()]),
      buildSubheading('Por cuenta (unidad)'),
      buildTable(
        ['Unidad', 'Deudor', 'Documento', 'Correo', 'Edad en mora', 'Deuda a la fecha'],
        resumen.map((row) => this.resumenCuentaExportRow(row)),
      ),
      buildSpacer(),
      buildSubheading('Detalle de transacciones'),
      buildTable(
        ['Cuenta', 'Periodo', 'Concepto', 'Cobrado', 'Pagado', 'Estado'],
        allData.map((h) => [
          h.cuenta,
          h.periodo,
          this.data.conceptoLabels[h.concepto],
          this.data.formatCurrency(h.valor_cobrado),
          this.data.formatCurrency(h.valor_pagado),
          this.data.estadoPagoLabels[h.estado_pago],
        ])
      ),
      buildSpacer(),
      buildSubheading('Trazabilidad de cobro por unidad'),
      ...(gestionRows.length
        ? [buildTable([...GESTION_EXPORT_HEADERS_CON_UNIDAD], gestionRows)]
        : [
            buildParagraph(
              'No hay trazabilidad de cobro registrada en las unidades de este cliente.',
            ),
          ]),
    ];

    await saveDocx(`informe_general_${c.nombre.replace(/\s/g, '_')}.docx`, children);
  }

  private resumenCuentaExportRow(row: ReturnType<typeof buildClientReportResumenRows>[number]): string[] {
    return resumenCuentaPdfRow(this.data, row);
  }

}
