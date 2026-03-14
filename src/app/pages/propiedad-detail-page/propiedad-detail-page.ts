import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { DataService } from '../../core/services/data.service';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ReportPreviewDialog } from '../../components/report-preview-dialog/report-preview-dialog';
import { PaymentReminderDialog } from '../../components/payment-reminder-dialog/payment-reminder-dialog';
import { RegistrarGestionDialog } from '../../components/registrar-gestion-dialog/registrar-gestion-dialog';
import type { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-propiedad-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    BalanceCard,
    StatusBadge,
    ReportPreviewDialog,
    PaymentReminderDialog,
    RegistrarGestionDialog,
    BaseChartDirective,
  ],
  template: `
    @if (!propiedad()) {
      <div class="p-12 text-center text-muted-foreground">
        Propiedad no encontrada.
        <a routerLink="/dashboard" class="ml-4 rounded-xl border border-border px-4 py-2">Volver</a>
      </div>
    } @else {
      <div class="min-h-screen pb-12">
        <div class="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
          <div class="max-w-6xl mx-auto">
            <a
              [routerLink]="['/clientes', propiedad()!.cliente_id]"
              class="inline-flex items-center gap-1.5 rounded-xl border border-primary-foreground/50 text-primary-foreground px-3 py-1.5 text-sm mb-4 hover:bg-primary-foreground/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Volver al cliente
            </a>
            <h1 class="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
              {{ propiedad()!.identificador }}
            </h1>
            <p class="text-primary-foreground/70 text-sm">
              {{ data.tipoPropiedadLabels[propiedad()!.tipo_propiedad] }} — {{ propiedad()!.direccion }}
              @if (cliente()) {
                — {{ cliente()!.nombre }}
              }
            </p>
          </div>
        </div>

        <div class="max-w-6xl mx-auto px-8 -mt-6 space-y-6">
          <!-- Tres tarjetas financieras -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <app-balance-card label="Total Cobrado" [amount]="totalCobrado()" />
            <app-balance-card label="Total Pagado" [amount]="totalPagado()" />
            <app-balance-card label="Monto a la fecha" [amount]="saldoActual()" variant="highlight" />
          </div>

          <!-- Recordatorio de Pago -->
          <div>
            <button
              type="button"
              (click)="reminderOpen.set(true)"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              Recordatorio de Pago
            </button>
          </div>

          <!-- Gráfico Cobrado vs Pagado por Periodo -->
          @if ((chartData().labels?.length ?? 0) > 0) {
            <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
              <h3 class="font-display font-bold text-foreground mb-4">Cobrado vs Pagado por Periodo</h3>
              <div class="h-[280px]">
                <canvas baseChart [data]="chartData()" [options]="barOptions" type="bar"></canvas>
              </div>
            </div>
          }

          <!-- Informe Interno: Historial de Pagos -->
          <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                Informe Interno: Historial de Pagos
              </h2>
              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="reportOpen.set(true)"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                  Editar y Descargar
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Agregar Registro
                </button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Periodo</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Concepto</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor Cobrado</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor Pagado</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Fecha Pago</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Monto a la fecha</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of historial(); track h.id) {
                    <tr class="border-b border-border/50 hover:bg-secondary/50">
                      <td class="px-4 py-3 font-mono text-sm">{{ h.periodo }}</td>
                      <td class="px-4 py-3">{{ data.conceptoLabels[h.concepto] }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ data.formatCurrency(h.valor_cobrado) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ data.formatCurrency(h.valor_pagado) }}</td>
                      <td class="px-4 py-3">
                        <app-status-badge [label]="data.estadoPagoLabels[h.estado_pago]" [variant]="h.estado_pago" />
                      </td>
                      <td class="px-4 py-3 text-muted-foreground">{{ h.fecha_pago || '—' }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ data.formatCurrency(h.monto_a_la_fecha) }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">
                          <button type="button" class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button type="button" class="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Gestiones de Cobro -->
          <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                Gestiones de Cobro
              </h2>
              <button
                type="button"
                (click)="gestionOpen.set(true)"
                class="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                + Registrar Gestión
              </button>
            </div>
            <ul class="space-y-3">
              @for (g of gestiones(); track g.id) {
                <li class="flex items-start gap-3 text-sm">
                  <span class="text-primary mt-1.5 shrink-0" aria-hidden="true">•</span>
                  <span>
                    <span class="text-muted-foreground font-medium">{{ g.fecha }}</span>
                    <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ml-2">{{ data.estadoGestionLabels[g.estado] ?? g.estado }}</span>
                    {{ g.descripcion }}
                  </span>
                </li>
              }
            </ul>
          </div>

          <!-- Estados de Cuenta -->
          <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                Estados de Cuenta
              </h2>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                Subir Archivo
              </button>
            </div>
            <div class="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-3 opacity-60">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
              <p class="text-sm font-medium">No hay estados de cuenta.</p>
              <p class="text-xs mt-1">Sube un PDF, Excel o imagen</p>
            </div>
          </div>
        </div>

        @if (reportOpen()) {
          <app-report-preview-dialog
            [open]="true"
            [propiedad]="propiedad()!"
            (openChange)="reportOpen.set($event)"
          />
        }
        @if (reminderOpen()) {
          <app-payment-reminder-dialog
            [open]="true"
            [propiedad]="propiedad()!"
            (openChange)="reminderOpen.set($event)"
          />
        }
        @if (gestionOpen()) {
          <app-registrar-gestion-dialog
            [open]="true"
            [propiedad]="propiedad()!"
            (openChange)="gestionOpen.set($event)"
            (saved)="onGestionSaved($event)"
          />
        }
      </div>
    }
  `,
})
export class PropiedadDetailPage {
  reportOpen = signal(false);
  reminderOpen = signal(false);
  gestionOpen = signal(false);

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => (typeof value === 'number' ? '$' + (value / 1_000_000).toFixed(1) + 'M' : value),
        },
      },
    },
    plugins: {
      legend: { position: 'top' },
    },
  };

  private id = computed(() => this.route.snapshot.paramMap.get('id')!);
  propiedad = computed(() => this.data.getPropiedadById(this.id()));
  cliente = computed(() => (this.propiedad() ? this.data.getClienteById(this.propiedad()!.cliente_id) : undefined));
  historial = computed(() => (this.id() ? this.data.getHistorialByPropiedad(this.id()) : []));
  gestiones = computed(() => (this.id() ? this.data.getGestionesByPropiedad(this.id()) : []));

  totalCobrado = computed(() => this.historial().reduce((s, h) => s + h.valor_cobrado, 0));
  totalPagado = computed(() => this.historial().reduce((s, h) => s + h.valor_pagado, 0));
  saldoActual = computed(() => this.totalCobrado() - this.totalPagado());

  chartData = computed((): ChartConfiguration<'bar'>['data'] => {
    const hist = this.historial();
    const periodos = [...new Set(hist.map((h) => h.periodo))].sort();
    return {
      labels: periodos,
      datasets: [
        {
          data: periodos.map((p) => hist.filter((h) => h.periodo === p).reduce((s, h) => s + h.valor_cobrado, 0)),
          label: 'Cobrado',
          backgroundColor: '#6b3cc8',
        },
        {
          data: periodos.map((p) => hist.filter((h) => h.periodo === p).reduce((s, h) => s + h.valor_pagado, 0)),
          label: 'Pagado',
          backgroundColor: '#22c55e',
        },
      ],
    };
  });

  constructor(
    private route: ActivatedRoute,
    protected data: DataService
  ) {}

  onGestionSaved(_event: { fecha: string; estado: string; descripcion: string }): void {
    // Opcional: persistir en DataService cuando exista addGestion
  }
}
