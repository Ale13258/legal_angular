import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { DataService } from '../../core/services/data.service';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ReportPreviewDialog } from '../../components/report-preview-dialog/report-preview-dialog';
import { PaymentReminderDialog } from '../../components/payment-reminder-dialog/payment-reminder-dialog';
import { RegistrarGestionDialog } from '../../components/registrar-gestion-dialog/registrar-gestion-dialog';
import { AgregarRegistroDialog } from '../../components/agregar-registro-dialog/agregar-registro-dialog';
import { fadeInFromLeft, fadeInUpStagger } from '../../core/animations/animations';
import type { ChartConfiguration } from 'chart.js';
import type { EstadoCuentaFile } from '../../core/models';

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
    AgregarRegistroDialog,
    BaseChartDirective,
  ],
  animations: [fadeInUpStagger, fadeInFromLeft],
  template: `
    @if (!propiedad()) {
      <div class="p-12 text-center text-muted-foreground">
        Propiedad no encontrada.
        <a routerLink="/dashboard" class="ml-4 rounded-xl border border-border px-4 py-2">Volver</a>
      </div>
    } @else {
      <div class="min-h-screen pb-12">
        <div class="gradient-hero page-container pt-6 pb-10 rounded-b-[2rem]">
          <div class="w-full">
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
            <span
              class="inline-block mt-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-medium px-2.5 py-0.5"
            >
              {{ data.tipoPropiedadLabels[propiedad()!.tipo_propiedad] }}
            </span>
            <p class="text-primary-foreground/70 text-sm mt-1.5">
              {{ propiedad()!.direccion }}
              @if (cliente()) {
                — {{ cliente()!.nombre }}
              }
            </p>
          </div>
        </div>

        <div class="page-container -mt-6 space-y-6">
          @if (error()) {
            <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ error() }}
            </div>
          }
          @if (loading()) {
            <div class="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Cargando detalle de la propiedad...
            </div>
          }
          <div [@fadeInUpStagger]="{ value: '', params: { delay: 0, duration: 300, offset: 8, ease: 'ease-out' } }">

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <app-balance-card label="Total Cobrado" [amount]="totalCobrado()" icon="cobrado" [accentLeft]="true" />
              <app-balance-card label="Total Pagado" [amount]="totalPagado()" icon="pagado" [accentLeft]="true" />
              <app-balance-card label="Deuda a la fecha" [amount]="deudaActual()" variant="highlight" icon="saldo" [accentLeft]="true" />
            </div>
            <button
              type="button"
              (click)="reminderOpen.set(true)"
              class="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity mb-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              Recordatorio de Pago
            </button>
            <div class="rounded-xl border border-border/50 bg-card p-4 sm:p-5 mb-4">
              <h3 class="text-sm font-semibold text-foreground mb-3">Cobro de esta unidad</h3>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div class="sm:col-span-2">
                  <dt class="text-muted-foreground text-xs uppercase tracking-wide mb-1">Etapa de cobranza</dt>
                  <dd class="font-medium text-foreground leading-snug">
                    {{ data.formatEtapaCobranza(resumenMora()?.edad_mora_dias) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground text-xs uppercase tracking-wide mb-1">Edad en mora</dt>
                  <dd class="font-medium tabular-nums">
                    {{ data.formatDiasMora(resumenMora()?.edad_mora_dias) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground text-xs uppercase tracking-wide mb-1">Inicio del cobro (sistema)</dt>
                  <dd class="font-medium" title="Solo si el backend envía fecha_inicio_cobro">
                    {{ data.formatFechaCorta(resumenMora()?.fecha_inicio_cobro) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground text-xs uppercase tracking-wide mb-1">Fin del cobro</dt>
                  <dd class="font-medium">
                    {{ data.formatFechaCorta(resumenMora()?.fecha_fin_cobro) }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Gráfico Cobrado vs Pagado por Periodo -->
          @if ((chartData().labels?.length ?? 0) > 0) {
            <div class="bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50 min-w-0">
              <h3 class="font-display font-bold text-foreground mb-4">Cobrado vs Pagado por Periodo</h3>
              <div class="h-[240px] sm:h-[280px]">
                <canvas baseChart [data]="chartData()" [options]="barOptions" type="bar"></canvas>
              </div>
            </div>
          }

          <!-- Informe Interno: Historial de Pagos -->
          <div class="bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                Informe Interno: Historial de Pagos
              </h2>
              <div class="flex flex-wrap gap-2">
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
                  (click)="registroOpen.set(true)"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Agregar Registro
                </button>
              </div>
            </div>
            <div class="table-wrap">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Periodo</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Concepto</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor Cobrado</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor Pagado</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Fecha Pago</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Deuda a la fecha</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of historial(); track h.id; let i = $index) {
                    <tr
                      [@fadeInUpStagger]="{ value: '', params: { delay: i * 40, duration: 200, offset: 5, ease: 'ease-out' } }"
                      class="border-b border-border/50 hover:bg-secondary/50"
                    >
                      <td class="px-4 py-3 font-mono text-sm">{{ h.periodo }}</td>
                      <td class="px-4 py-3">{{ data.conceptoLabels[h.concepto] }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ data.formatCurrency(h.valor_cobrado) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ data.formatCurrency(h.valor_pagado) }}</td>
                      <td class="px-4 py-3">
                        <app-status-badge [label]="data.estadoPagoLabels[h.estado_pago]" [variant]="h.estado_pago" />
                      </td>
                      <td class="px-4 py-3 text-muted-foreground">{{ h.fecha_pago || '—' }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ data.formatDeuda(h.monto_a_la_fecha) }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">
                          <button type="button" class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            type="button"
                            (click)="openDeleteRegistroConfirm(h.id)"
                            class="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar"
                          >
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
          <div class="bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
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
                Registrar Gestión
              </button>
            </div>
            @if (gestiones().length === 0) {
              <div class="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-3 opacity-60">
                  <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
                </svg>
                <p class="text-sm font-medium">No hay gestiones de cobro.</p>
                <p class="text-xs mt-1">Registra la primera gestión para llevar el historial</p>
              </div>
            } @else {
              <div class="border-l-2 border-primary/20 pl-6 sm:pl-8 space-y-4">
                @for (g of gestiones(); track g.id; let i = $index) {
                  <div
                    [@fadeInFromLeft]="{ value: '', params: { delay: i * 50, duration: 250 } }"
                    class="relative"
                  >
                    <span
                      class="absolute w-3 h-3 rounded-full bg-primary border-2 border-card -left-[29px] sm:-left-[37px] top-2"
                      aria-hidden="true"
                    ></span>
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2 mb-1">
                        <span class="text-muted-foreground text-xs font-medium">{{ g.fecha }}</span>
                        <app-status-badge
                          [label]="data.estadoGestionLabels[g.estado]"
                          [variant]="g.estado"
                        />
                      </div>
                      <p class="text-foreground text-sm">{{ g.descripcion }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Estados de Cuenta -->
          <div class="bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                Estados de Cuenta
              </h2>
              <button
                type="button"
                (click)="triggerEstadoCuentaFilePicker()"
                [disabled]="estadoCuentaUploading()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                {{ estadoCuentaUploading() ? 'Subiendo...' : 'Subir Archivo' }}
              </button>
              <input
                #estadoCuentaFileInput
                type="file"
                class="hidden"
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                (change)="onEstadoCuentaFileSelected($event)"
              />
            </div>
            @if (estadoCuentaError()) {
              <div class="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ estadoCuentaError() }}
              </div>
            }
            @if (estadoCuentaLoading()) {
              <div class="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Cargando archivos...
              </div>
            } @else if (estadoCuentaFiles().length === 0) {
              <div class="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-3 opacity-60">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
                </svg>
                <p class="text-sm font-medium">No hay estados de cuenta.</p>
                <p class="text-xs mt-1">Sube un PDF, Excel o imagen</p>
              </div>
            } @else {
              <div class="overflow-x-auto rounded-xl border border-border/60">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-border bg-muted/30">
                      <th class="px-3 py-2 text-left font-semibold text-muted-foreground">Archivo</th>
                      <th class="px-3 py-2 text-left font-semibold text-muted-foreground">Tipo</th>
                      <th class="px-3 py-2 text-right font-semibold text-muted-foreground">Tamano</th>
                      <th class="px-3 py-2 text-left font-semibold text-muted-foreground">Fecha de subida</th>
                      <th class="px-3 py-2 text-right font-semibold text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (f of estadoCuentaFiles(); track f.id) {
                      <tr class="border-b border-border/40">
                        <td class="px-3 py-2 text-foreground">{{ f.nombre }}</td>
                        <td class="px-3 py-2 text-muted-foreground">{{ f.mime_type }}</td>
                        <td class="px-3 py-2 text-right tabular-nums">{{ formatFileSize(f.tamano_bytes) }}</td>
                        <td class="px-3 py-2 text-muted-foreground">{{ data.formatFechaCorta(f.fecha_subida) }}</td>
                        <td class="px-3 py-2">
                          <div class="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              (click)="downloadEstadoCuentaFile(f)"
                              class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                            >
                              Descargar
                            </button>
                            <button
                              type="button"
                              (click)="deleteEstadoCuentaFile(f.id)"
                              class="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
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
        @if (registroOpen()) {
          <app-agregar-registro-dialog
            [open]="true"
            [propiedad]="propiedad()!"
            (openChange)="registroOpen.set($event)"
            (saved)="onRegistroSaved()"
          />
        }
        @if (deleteConfirmOpen()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-black/50" (click)="cancelDeleteRegistro()"></div>
            <div class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div class="mb-4 flex items-start gap-3">
                <div class="rounded-xl bg-destructive/10 p-2 text-destructive">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                </div>
                <div>
                  <h3 class="font-display text-lg font-bold text-foreground">Confirmar eliminacion</h3>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Vas a eliminar este registro del historial de pagos.
                  </p>
                  <p class="mt-1 text-xs text-destructive/90">Esta accion no se puede deshacer.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  type="button"
                  (click)="cancelDeleteRegistro()"
                  class="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  (click)="confirmDeleteRegistro()"
                  class="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class PropiedadDetailPage {
  @ViewChild('estadoCuentaFileInput') private estadoCuentaFileInput?: ElementRef<HTMLInputElement>;
  reportOpen = signal(false);
  reminderOpen = signal(false);
  gestionOpen = signal(false);
  registroOpen = signal(false);
  deleteConfirmOpen = signal(false);
  estadoCuentaLoading = signal(false);
  estadoCuentaError = signal<string | null>(null);
  estadoCuentaUploading = signal(false);
  historialToDeleteId = signal<string | null>(null);

  private refreshTrigger = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

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
  resumenMora = computed(() => {
    const p = this.propiedad();
    return p ? this.data.getResumenMoraCobroParaPropiedad(p) : null;
  });
  cliente = computed(() => (this.propiedad() ? this.data.getClienteById(this.propiedad()!.cliente_id) : undefined));
  historial = computed(() => {
    this.refreshTrigger();
    return this.id() ? this.data.getHistorialByPropiedad(this.id()) : [];
  });
  gestiones = computed(() => (this.id() ? this.data.getGestionesByPropiedad(this.id()) : []));
  estadoCuentaFiles = computed(() => (this.id() ? this.data.getEstadoCuentaFilesByPropiedad(this.id()) : []));

  totalCobrado = computed(() => {
    const p = this.propiedad();
    return p ? this.data.getTotalCobradoParaPropiedad(p) : 0;
  });
  totalPagado = computed(() => this.historial().reduce((s, h) => s + this.toNumber(h.valor_pagado), 0));
  deudaActual = computed(() => {
    const p = this.propiedad();
    return p ? this.data.getDeudaActualParaPropiedad(p) : 0;
  });

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
  ) {
    void this.init();
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    const id = this.id();
    try {
      const propiedad = await this.data.loadPropiedad(id);
      await Promise.all([
        this.data.loadCliente(propiedad.cliente_id),
        this.data.loadHistorialByPropiedad(id),
        this.data.loadGestionesByPropiedad(id),
        this.loadEstadoCuentaFiles(id),
      ]);
    } catch {
      this.error.set('No se pudo cargar el detalle de la propiedad.');
    } finally {
      this.loading.set(false);
    }
  }

  async onGestionSaved(event: {
    fecha: string;
    estado: string;
    descripcion: string;
  }): Promise<void> {
    const propiedadId = this.id();
    console.log('[LegalDebug][PropiedadDetailPage] onGestionSaved()', { propiedadId, event });
    try {
      await this.data.addGestion(propiedadId, event);
      console.log('[LegalDebug][PropiedadDetailPage] onGestionSaved() addGestion OK');
    } catch (err) {
      console.error('[LegalDebug][PropiedadDetailPage] onGestionSaved() addGestion FAIL', err);
    }
  }

  async onRegistroSaved(): Promise<void> {
    const id = this.id();
    console.log('[LegalDebug][PropiedadDetailPage] onRegistroSaved() refrescando lista', { id });
    await this.data.loadHistorialByPropiedad(id);
    await this.data.loadPropiedad(id);
    this.refreshTrigger.update((v) => v + 1);
    console.log('[LegalDebug][PropiedadDetailPage] onRegistroSaved() hecho');
  }

  triggerEstadoCuentaFilePicker(): void {
    this.estadoCuentaError.set(null);
    this.estadoCuentaFileInput?.nativeElement.click();
  }

  async onEstadoCuentaFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (!file) return;
    this.estadoCuentaError.set(null);
    const validationError = this.validateEstadoCuentaFile(file);
    if (validationError) {
      this.estadoCuentaError.set(validationError);
      this.clearEstadoCuentaInput();
      return;
    }
    this.estadoCuentaUploading.set(true);
    try {
      await this.data.uploadEstadoCuentaFileMock(this.id(), { file });
    } catch {
      this.estadoCuentaError.set('No se pudo subir el archivo. Intenta nuevamente.');
    } finally {
      this.estadoCuentaUploading.set(false);
      this.clearEstadoCuentaInput();
    }
  }

  async deleteEstadoCuentaFile(fileId: string): Promise<void> {
    this.estadoCuentaError.set(null);
    try {
      await this.data.deleteEstadoCuentaFileMock(this.id(), fileId);
    } catch {
      this.estadoCuentaError.set('No se pudo eliminar el archivo. Intenta nuevamente.');
    }
  }

  downloadEstadoCuentaFile(file: EstadoCuentaFile): void {
    const safeName = file.nombre.endsWith('.txt') ? file.nombre : `${file.nombre}.txt`;
    const blob = new Blob(
      [
        [
          'Archivo en modo mock local.',
          `Nombre: ${file.nombre}`,
          `Subido: ${new Date(file.fecha_subida).toLocaleString('es-CO')}`,
          'Nota: en esta fase no se persiste el binario real, solo metadata.',
        ].join('\n'),
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openDeleteRegistroConfirm(historialId: string): void {
    this.historialToDeleteId.set(historialId);
    this.deleteConfirmOpen.set(true);
  }

  cancelDeleteRegistro(): void {
    this.deleteConfirmOpen.set(false);
    this.historialToDeleteId.set(null);
  }

  async confirmDeleteRegistro(): Promise<void> {
    const historialId = this.historialToDeleteId();
    const propiedadId = this.id();
    if (!historialId || !propiedadId) return;
    this.error.set(null);
    try {
      await this.data.deleteHistorialPago(propiedadId, historialId);
      this.refreshTrigger.update((v) => v + 1);
      this.cancelDeleteRegistro();
    } catch {
      this.error.set('No se pudo eliminar el registro. Intenta nuevamente.');
    }
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private async loadEstadoCuentaFiles(propiedadId: string): Promise<void> {
    this.estadoCuentaLoading.set(true);
    this.estadoCuentaError.set(null);
    try {
      await this.data.loadEstadoCuentaFilesByPropiedad(propiedadId);
    } catch {
      this.estadoCuentaError.set('No se pudieron cargar los archivos de estado de cuenta.');
    } finally {
      this.estadoCuentaLoading.set(false);
    }
  }

  private validateEstadoCuentaFile(file: File): string | null {
    const allowedExtensions = ['pdf', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp'];
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return 'Formato no permitido. Usa PDF, Excel, CSV o imagen.';
    }
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return 'El archivo excede 10MB.';
    }
    return null;
  }

  formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx += 1;
    }
    return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  private clearEstadoCuentaInput(): void {
    if (this.estadoCuentaFileInput?.nativeElement) {
      this.estadoCuentaFileInput.nativeElement.value = '';
    }
  }

}
