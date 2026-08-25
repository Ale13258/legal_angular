import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { DataService } from '../../core/services/data.service';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { ReportPreviewDialog } from '../../components/report-preview-dialog/report-preview-dialog';
import { PaymentReminderDialog } from '../../components/payment-reminder-dialog/payment-reminder-dialog';
import { EmailReminderDetailDialog } from '../../components/email-reminder-detail-dialog/email-reminder-detail-dialog';
import { RegistrarGestionDialog } from '../../components/registrar-gestion-dialog/registrar-gestion-dialog';
import { AgregarRegistroDialog } from '../../components/agregar-registro-dialog/agregar-registro-dialog';
import { fadeInFromLeft, fadeInUpStagger } from '../../core/animations/animations';
import type { ChartConfiguration } from 'chart.js';
import type { EstadoCuentaFile, Gestion, HistorialPago } from '../../core/models';
import { resolveDeudores } from '../../core/utils/normalize-cuenta-deudores';

@Component({
  selector: 'app-cuenta-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    BalanceCard,
    StatusBadge,
    ReportPreviewDialog,
    PaymentReminderDialog,
    EmailReminderDetailDialog,
    RegistrarGestionDialog,
    AgregarRegistroDialog,
    BaseChartDirective,
  ],
  animations: [fadeInUpStagger, fadeInFromLeft],
  template: `
    @if (!cuenta()) {
      <div class="p-12 text-center text-muted-foreground">
        Propiedad no encontrada.
        <a routerLink="/dashboard" class="ml-4 rounded-xl border border-border px-4 py-2">Volver</a>
      </div>
    } @else {
      <div class="min-h-screen pb-12">
        <div class="gradient-hero page-container pt-6 pb-10 rounded-b-[2rem]">
          <div class="w-full">
            <a
              [routerLink]="['/clientes', cuenta()!.cliente_id]"
              class="inline-flex items-center gap-1.5 rounded-xl border border-primary-foreground/50 text-primary-foreground px-3 py-1.5 text-sm mb-4 hover:bg-primary-foreground/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Volver al cliente
            </a>
            <h1 class="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
              {{ cuenta()!.identificador }}
            </h1>
            <span
              class="inline-block mt-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-medium px-2.5 py-0.5"
            >
              {{ data.tipoCuentaLabels[cuenta()!.tipo_cuenta] }}
            </span>
            <p class="text-primary-foreground/70 text-sm mt-1.5">
              {{ cuenta()!.direccion }}
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
                @for (d of deudoresUnidad(); track $index; let i = $index) {
                  <div>
                    <dt class="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                      {{ deudoresUnidad().length > 1 ? 'Usuario a cobrar ' + (i + 1) : 'Usuario a cobrar' }}
                    </dt>
                    <dd class="font-medium text-foreground leading-snug">{{ d.nombre || '—' }}</dd>
                    <dd class="text-sm text-muted-foreground mt-0.5">
                      {{ d.tipo_persona === 'natural' ? 'CC' : 'NIT' }}:
                      {{ d.documento || '—' }}
                    </dd>
                    @if (d.emails.length === 0) {
                      <dd class="text-sm text-muted-foreground mt-0.5">Correo: —</dd>
                    } @else {
                      @for (email of d.emails; track email) {
                        <dd class="text-sm text-muted-foreground mt-0.5">{{ email }}</dd>
                      }
                    }
                    <dd class="text-sm text-muted-foreground mt-0.5">
                      Teléfono: {{ d.telefono?.trim() || '—' }}
                    </dd>
                  </div>
                }
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
                  <dt class="text-muted-foreground text-xs uppercase tracking-wide mb-1">Inicio del cobro</dt>
                  <dd class="font-medium" title="Fecha de inicio de cobro o, si no está cargada, el alta de la cuenta">
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
                  (click)="openNuevoRegistro()"
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
                      <td class="px-4 py-3 text-muted-foreground">{{ data.formatFechaPago(h) }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">{{ data.formatDeuda(deudaHistorial(h)) }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            (click)="editarRegistro(h)"
                            class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Editar"
                          >
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

          <!-- Trazabilidad de cobro -->
          <div class="bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                Trazabilidad de cobro
              </h2>
              <button
                type="button"
                (click)="openNuevaGestion()"
                class="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Registrar trazabilidad
              </button>
            </div>
            @if (gestiones().length === 0) {
              <div class="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-3 opacity-60">
                  <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
                </svg>
                <p class="text-sm font-medium">No hay trazabilidad de cobro.</p>
                <p class="text-xs mt-1">Registra el primer evento para llevar el historial</p>
              </div>
            } @else {
              <div class="border-l-2 border-primary/20 pl-6 sm:pl-8 space-y-4">
                @for (g of gestiones(); track g.id; let i = $index) {
                  <div
                    [@fadeInFromLeft]="{ value: '', params: { delay: i * 50, duration: 250 } }"
                    class="relative flex items-start justify-between gap-2"
                  >
                    <span
                      class="absolute w-3 h-3 rounded-full bg-primary border-2 border-card -left-[29px] sm:-left-[37px] top-2"
                      aria-hidden="true"
                    ></span>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2 mb-1">
                        <span class="text-muted-foreground text-xs font-medium">{{ data.formatGestionFecha(g) }}</span>
                        <app-status-badge
                          [label]="data.estadoGestionLabels[data.getGestionEstado(g)] || data.getGestionEstado(g)"
                          [variant]="data.getGestionEstado(g)"
                        />
                        @if (data.isGestionEmailReminder(g)) {
                          <span class="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary font-semibold">
                            Correo
                          </span>
                        }
                      </div>
                      @if (data.isGestionEmailReminder(g)) {
                        <div class="mt-0.5 flex flex-col gap-1.5 sm:flex-row sm:items-center">
                          <p class="min-w-0 flex-1 text-sm text-foreground line-clamp-2">
                            {{ data.getGestionDescripcion(g) }}
                          </p>
                          <button
                            type="button"
                            (click)="openEmailReminderDetail(g)"
                            class="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Ver
                          </button>
                        </div>
                      } @else {
                        <p class="text-foreground text-sm">{{ data.getGestionDescripcion(g) }}</p>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>

        @if (reportOpen()) {
          <app-report-preview-dialog
            [open]="true"
            [cuenta]="cuenta()!"
            (openChange)="reportOpen.set($event)"
          />
        }
        @if (reminderOpen()) {
          <app-payment-reminder-dialog
            [open]="true"
            [cuenta]="cuenta()!"
            (openChange)="reminderOpen.set($event)"
            (sent)="onReminderSent()"
          />
        }
        @if (emailReminderDetailOpen() && emailReminderId()) {
          <app-email-reminder-detail-dialog
            [open]="true"
            [reminderId]="emailReminderId()!"
            (openChange)="onEmailReminderDetailOpenChange($event)"
          />
        }
        @if (gestionOpen()) {
          <app-registrar-gestion-dialog
            [open]="true"
            [cuenta]="cuenta()!"
            [gestion]="gestionEditing()"
            [gestionFormNonce]="gestionDialogNonce()"
            (openChange)="onGestionDialogOpenChange($event)"
            (saved)="onGestionSaved($event)"
          />
        }
        @if (registroOpen()) {
          <app-agregar-registro-dialog
            [open]="true"
            [cuenta]="cuenta()!"
            [historial]="registroEditing()"
            [registroFormNonce]="registroDialogNonce()"
            (openChange)="onRegistroDialogOpenChange($event)"
            (saved)="onRegistroSaved()"
          />
        }
        @if (deleteConfirmOpen()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-black/50" (click)="cancelDeleteRegistro()"></div>
            <div
              class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
              (click)="$event.stopPropagation()"
            >
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

              @if (deleteRegistroError()) {
                <div class="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {{ deleteRegistroError() }}
                </div>
              }

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
        @if (deleteGestionConfirmOpen() && gestionToDelete()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-black/50" (click)="cancelDeleteGestion()"></div>
            <div class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div class="mb-4 flex items-start gap-3">
                <div class="rounded-xl bg-destructive/10 p-2 text-destructive">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                </div>
                <div>
                  <h3 class="font-display text-lg font-bold text-foreground">Confirmar eliminacion</h3>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Vas a eliminar este registro de trazabilidad del {{ data.formatGestionFecha(gestionToDelete()!) }}.
                  </p>
                  <p class="mt-1 text-xs text-destructive/90">Esta accion no se puede deshacer.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  type="button"
                  (click)="cancelDeleteGestion()"
                  class="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  (click)="confirmDeleteGestion()"
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
export class CuentaDetailPage {
  @ViewChild('estadoCuentaFileInput') private estadoCuentaFileInput?: ElementRef<HTMLInputElement>;
  reportOpen = signal(false);
  reminderOpen = signal(false);
  emailReminderDetailOpen = signal(false);
  emailReminderId = signal<string | null>(null);
  gestionOpen = signal(false);
  gestionEditing = signal<Gestion | null>(null);
  gestionDialogNonce = signal(0);
  gestionToDelete = signal<Gestion | null>(null);
  deleteGestionConfirmOpen = signal(false);
  registroOpen = signal(false);
  registroEditing = signal<HistorialPago | null>(null);
  registroDialogNonce = signal(0);
  deleteConfirmOpen = signal(false);
  deleteRegistroError = signal<string | null>(null);
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
  cuenta = computed(() => this.data.getCuentaById(this.id()));
  deudoresUnidad = computed(() => {
    const p = this.cuenta();
    return p ? resolveDeudores(p) : [];
  });
  resumenMora = computed(() => {
    const p = this.cuenta();
    return p ? this.data.getResumenMoraCobroParaCuenta(p) : null;
  });
  cliente = computed(() => (this.cuenta() ? this.data.getClienteById(this.cuenta()!.cliente_id) : undefined));
  historial = computed(() => {
    this.refreshTrigger();
    return this.id() ? this.data.getHistorialByCuenta(this.id()) : [];
  });
  gestiones = computed(() => (this.id() ? this.data.getGestionesByCuenta(this.id()) : []));
  estadoCuentaFiles = computed(() => (this.id() ? this.data.getEstadoCuentaFilesByCuenta(this.id()) : []));

  totalCobrado = computed(() => {
    const p = this.cuenta();
    return p ? this.data.getTotalCobradoParaCuenta(p) : 0;
  });
  totalPagado = computed(() => this.historial().reduce((s, h) => s + this.toNumber(h.valor_pagado), 0));
  deudaActual = computed(() => {
    const p = this.cuenta();
    return p ? this.data.getDeudaActualParaCuenta(p) : 0;
  });

  deudaHistorial(h: HistorialPago): number {
    const p = this.cuenta();
    return p ? this.data.getDeudaParaHistorialPago(p, h) : 0;
  }

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
      const cuenta = await this.data.loadCuenta(id);
      await Promise.all([
        this.data.loadCliente(cuenta.cliente_id),
        this.data.loadHistorialByCuenta(id),
        this.data.loadGestionesByCuenta(id),
      ]);
    } catch {
      this.error.set('No se pudo cargar el detalle de la propiedad.');
    } finally {
      this.loading.set(false);
    }
  }

  openNuevaGestion(): void {
    this.gestionEditing.set(null);
    this.gestionDialogNonce.update((n) => n + 1);
    this.gestionOpen.set(true);
  }

  editarGestion(g: Gestion): void {
    if (this.data.isGestionEmailReminder(g)) return;
    this.gestionEditing.set(g);
    this.gestionDialogNonce.update((n) => n + 1);
    this.gestionOpen.set(true);
  }

  openEmailReminderDetail(g: Gestion): void {
    // Detalle del correo: GET /payment-reminders/{gestion.id} (ya no hay id de tabla de correo).
    const gestionId = g.id?.trim();
    if (!gestionId) {
      this.error.set('Este registro no tiene identificador para ver el correo.');
      return;
    }
    this.emailReminderId.set(gestionId);
    this.emailReminderDetailOpen.set(true);
  }

  onEmailReminderDetailOpenChange(open: boolean): void {
    this.emailReminderDetailOpen.set(open);
    if (!open) {
      this.emailReminderId.set(null);
    }
  }

  async onReminderSent(): Promise<void> {
    const id = this.id();
    this.error.set(null);
    try {
      await this.data.loadGestionesByCuenta(id);
    } catch {
      // El envío ya se confirmó; el timeline se actualizará al recargar.
    }
  }

  onGestionDialogOpenChange(open: boolean): void {
    this.gestionOpen.set(open);
    if (!open) {
      this.gestionEditing.set(null);
    }
  }

  async onGestionSaved(event: {
    fecha: string;
    estado: string;
    descripcion: string;
  }): Promise<void> {
    const cuentaId = this.id();
    const editing = this.gestionEditing();
    if (editing && this.data.isGestionEmailReminder(editing)) {
      this.error.set('Los registros de correo no se pueden editar.');
      return;
    }
    this.error.set(null);
    try {
      if (editing) {
        await this.data.updateGestion(cuentaId, editing.id, event);
      } else {
        await this.data.addGestion(cuentaId, event);
      }
      this.onGestionDialogOpenChange(false);
    } catch (err) {
      this.error.set(this.gestionMutationError(err, editing ? 'editar' : 'registrar'));
    }
  }

  openDeleteGestionConfirm(g: Gestion): void {
    if (this.data.isGestionEmailReminder(g)) return;
    this.gestionToDelete.set(g);
    this.deleteGestionConfirmOpen.set(true);
  }

  cancelDeleteGestion(): void {
    this.deleteGestionConfirmOpen.set(false);
    this.gestionToDelete.set(null);
  }

  async confirmDeleteGestion(): Promise<void> {
    const g = this.gestionToDelete();
    const cuentaId = this.id();
    if (!g || !cuentaId) return;
    if (this.data.isGestionEmailReminder(g)) {
      this.error.set('Los registros de correo no se pueden eliminar.');
      this.cancelDeleteGestion();
      return;
    }
    this.error.set(null);
    try {
      await this.data.deleteGestion(cuentaId, g.id);
      this.cancelDeleteGestion();
    } catch (err) {
      this.error.set(this.gestionMutationError(err, 'eliminar'));
    }
  }

  private gestionMutationError(error: unknown, action: 'editar' | 'registrar' | 'eliminar'): string {
    const httpErr = error as { status?: number; error?: { code?: string; message?: string } };
    if (httpErr?.status === 403 || httpErr?.error?.code === 'GESTION_READONLY') {
      return 'Este registro de correo es de solo lectura.';
    }
    if (action === 'editar') {
      return 'No se pudo editar la trazabilidad. Verifica los datos e intenta nuevamente.';
    }
    if (action === 'eliminar') {
      return 'No se pudo eliminar la trazabilidad. Intenta nuevamente.';
    }
    return 'No se pudo registrar la trazabilidad. Verifica los datos e intenta nuevamente.';
  }

  async onRegistroSaved(): Promise<void> {
    const id = this.id();
    await this.data.loadHistorialByCuenta(id);
    await this.data.loadCuenta(id);
    this.refreshTrigger.update((v) => v + 1);
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
      this.clearEstadoProcesoLegalInput();
      return;
    }
    this.estadoCuentaUploading.set(true);
    try {
      await this.data.uploadEstadoCuentaFileMock(this.id(), { file });
    } catch {
      this.estadoCuentaError.set('No se pudo subir el archivo. Intenta nuevamente.');
    } finally {
      this.estadoCuentaUploading.set(false);
      this.clearEstadoProcesoLegalInput();
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
          `Subido: ${this.data.formatFechaHora(file.fecha_subida)}`,
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

  openNuevoRegistro(): void {
    this.registroEditing.set(null);
    this.registroDialogNonce.update((n) => n + 1);
    this.registroOpen.set(true);
  }

  editarRegistro(h: HistorialPago): void {
    this.registroEditing.set(h);
    this.registroDialogNonce.update((n) => n + 1);
    this.registroOpen.set(true);
  }

  onRegistroDialogOpenChange(open: boolean): void {
    this.registroOpen.set(open);
    if (!open) {
      this.registroEditing.set(null);
    }
  }

  openDeleteRegistroConfirm(historialId: string): void {
    this.historialToDeleteId.set(historialId);
    this.deleteRegistroError.set(null);
    this.deleteConfirmOpen.set(true);
  }

  cancelDeleteRegistro(): void {
    this.deleteConfirmOpen.set(false);
    this.historialToDeleteId.set(null);
    this.deleteRegistroError.set(null);
  }

  async confirmDeleteRegistro(): Promise<void> {
    const historialId = this.historialToDeleteId();
    const cuentaId = this.id();
    if (!historialId || !cuentaId) return;
    this.deleteRegistroError.set(null);
    try {
      await this.data.deleteHistorialPago(cuentaId, historialId);
      await this.data.loadCuenta(cuentaId);
      this.refreshTrigger.update((v) => v + 1);
      this.cancelDeleteRegistro();
    } catch {
      this.deleteRegistroError.set('No se pudo eliminar el registro. Intenta nuevamente.');
    }
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private async loadEstadoCuentaFiles(cuentaId: string): Promise<void> {
    this.estadoCuentaLoading.set(true);
    this.estadoCuentaError.set(null);
    try {
      await this.data.loadEstadoCuentaFilesByCuenta(cuentaId);
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

  private clearEstadoProcesoLegalInput(): void {
    if (this.estadoCuentaFileInput?.nativeElement) {
      this.estadoCuentaFileInput.nativeElement.value = '';
    }
  }

}
