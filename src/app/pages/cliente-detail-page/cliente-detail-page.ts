import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService, type CreatePropiedadPayload, type UpdatePropiedadPayload } from '../../core/services/data.service';
import { ClientReportDialog } from '../../components/client-report-dialog/client-report-dialog';
import { CrearCuentaDialog } from '../../components/crear-cuenta-dialog/crear-cuenta-dialog';
import { ReportPreviewDialog } from '../../components/report-preview-dialog/report-preview-dialog';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { fadeInUpStagger } from '../../core/animations/animations';
import type { Cuenta, Propiedad, TipoPropiedad } from '../../core/models';

@Component({
  selector: 'app-cliente-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    BalanceCard,
    StatusBadge,
    ClientReportDialog,
    CrearCuentaDialog,
    ReportPreviewDialog,
  ],
  animations: [fadeInUpStagger],
  template: `
    @if (!cliente()) {
      <div class="p-12 text-center text-muted-foreground">
        Cliente no encontrado.
        <a routerLink="/dashboard" class="ml-4 rounded-xl border border-border px-4 py-2">Volver</a>
      </div>
    } @else {
      <div class="min-h-screen pb-12">
        <div class="gradient-hero page-container pt-6 pb-10 rounded-b-[2rem]">
          <div class="w-full">
            <a
              routerLink="/dashboard"
              class="inline-flex items-center gap-1.5 rounded-xl border border-primary-foreground/50 text-primary-foreground px-3 py-1.5 text-sm mb-4 hover:bg-primary-foreground/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Volver
            </a>
            <h1 class="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
              {{ cliente()!.nombre }}
            </h1>
            <p class="text-primary-foreground/70 text-sm">
              {{ cliente()!.tipo_persona === 'natural' ? 'CC' : 'NIT' }}:
              {{ cliente()!.documento }}
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
              Cargando detalle del cliente...
            </div>
          }
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50 min-w-0">
              <h2 class="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Información del Cliente
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div class="flex items-center gap-2 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-muted-foreground"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  {{ cliente()!.email }}
                </div>
                <div class="flex items-center gap-2 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {{ cliente()!.telefono }}
                </div>
                <div class="col-span-2 flex items-start gap-2 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 mt-0.5 text-muted-foreground"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  {{ cliente()!.direccion }}
                </div>
                @if (cliente()!.observaciones) {
                  <div class="col-span-2 bg-secondary/50 rounded-xl p-3 text-muted-foreground text-sm">
                    <span class="font-medium text-foreground">Observaciones:</span>
                    {{ cliente()!.observaciones }}
                  </div>
                }
              </div>
            </div>
            <div class="flex flex-col gap-3">
              <app-balance-card
                label="Deuda a la fecha"
                [amount]="totalMonto()"
                variant="highlight"
                icon="saldo"
                [accentLeft]="true"
              />
              <button
                type="button"
                (click)="clientReportOpen.set(true)"
                class="w-full rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted inline-flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                Informe General
              </button>
            </div>
          </div>

          <div class="bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary shrink-0"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                Propiedades del Cliente
              </h2>
              <button
                type="button"
                (click)="openNuevaPropiedad()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Añadir Propiedad
              </button>
            </div>
            <div class="table-wrap">
              <table class="w-full min-w-[56rem] table-fixed">
                <colgroup>
                  <col class="w-[26%]" />
                  <col class="w-[10%]" />
                  <col class="w-[14%]" />
                  <col class="w-[18%]" />
                  <col class="w-[14%]" />
                  <col class="w-[18%]" />
                </colgroup>
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Propiedad</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Identificador</th>
                    <th
                      class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap"
                      title="Días en mora y etapa. Pasa el cursor para ver alta en app, inicio y fin de cobro."
                    >
                      Edad en mora
                    </th>
                    <th class="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Deuda a la fecha</th>
                    <th class="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of propiedades(); track p.id; let i = $index) {
                    <tr
                      [@fadeInUpStagger]="{ value: '', params: { delay: i * 50, duration: 200, offset: 5, ease: 'ease-out' } }"
                      class="border-b border-border/50 hover:bg-secondary/50"
                    >
                      <td class="px-4 py-3 text-muted-foreground">
                        <div class="truncate" [title]="p.direccion">{{ p.direccion }}</div>
                      </td>
                      <td class="px-4 py-3">
                        <app-status-badge [label]="data.tipoPropiedadLabels[p.tipo_propiedad]" [variant]="p.tipo_propiedad" />
                      </td>
                      <td class="px-4 py-3 font-medium">
                        <div class="truncate" [title]="p.identificador">{{ p.identificador }}</div>
                      </td>
                      <td
                        class="px-4 py-3 text-right text-sm align-top max-w-[14rem]"
                        [title]="data.formatResumenMoraTooltip(resumenCobro(p))"
                      >
                        <div class="font-medium tabular-nums text-foreground">
                          {{ data.formatDiasMora(resumenCobro(p).edad_mora_dias) }}
                        </div>
                        <div class="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                          {{ data.formatEtapaCobranzaCorta(resumenCobro(p).edad_mora_dias) }}
                        </div>
                      </td>
                      <td class="px-3 py-3 text-right tabular-nums whitespace-nowrap align-middle">
                        {{ data.formatDeuda(data.getDeudaActualParaPropiedad(p)) }}
                      </td>
                      <td class="px-3 py-3 whitespace-nowrap align-middle text-right">
                        <div class="inline-flex items-center justify-end gap-1 shrink-0">
                          <button
                            type="button"
                            (click)="openPropReport(p)"
                            class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Informe"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                          </button>
                          <a
                            [routerLink]="['/propiedades', p.id]"
                            class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Ver detalle"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </a>
                          <button
                            type="button"
                            (click)="editarPropiedad(p)"
                            class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            type="button"
                            (click)="eliminarPropiedad(p)"
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

          <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 class="font-display font-bold text-lg">Cuentas del Cliente</h2>
              <button
                type="button"
                (click)="openNuevaCuenta()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Añadir cuenta
              </button>
            </div>
            <p class="text-sm text-muted-foreground mb-4">
              El tipo, estado y etapa alimentan el dashboard y los informes. Crea al menos una cuenta por cliente si aplica a tu operación.
            </p>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cuenta</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Etapa</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cu of cuentas(); track cu.id) {
                    <tr class="border-b border-border/50">
                      <td class="px-4 py-3 font-mono text-sm">{{ cu.numero_cuenta }}</td>
                      <td class="px-4 py-3">
                        <app-status-badge
                          [label]="data.tipoCuentaLabels[cu.tipo]"
                          [variant]="
                            cu.tipo === 'juridica'
                              ? 'juridica'
                              : cu.tipo === 'extrajudicial'
                                ? 'pendiente'
                                : 'parcial'
                          "
                        />
                      </td>
                      <td class="px-4 py-3">
                        <app-status-badge [label]="data.estadoCuentaLabels[cu.estado]" [variant]="cu.estado" />
                      </td>
                      <td class="px-4 py-3 text-muted-foreground">{{ data.etapaProcesoLabels[cu.etapa_proceso] }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            (click)="editarCuenta(cu)"
                            class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Editar cuenta"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            type="button"
                            (click)="eliminarCuenta(cu)"
                            class="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar cuenta"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-4 py-10 text-center text-sm text-muted-foreground">
                        No hay cuentas. Pulsa <span class="font-medium text-foreground">Añadir cuenta</span> para registrar tipo, estado y etapa.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      @if (clientReportOpen()) {
        <app-client-report-dialog
          [open]="true"
          [cliente]="cliente()!"
          [propiedades]="propiedades()"
          (openChange)="clientReportOpen.set($event)"
        />
      }
      @if (propReportOpen() && selectedProp()) {
        <app-report-preview-dialog
          [open]="true"
          [propiedad]="selectedProp()!"
          (openChange)="propReportOpen.set($event)"
        />
      }

      @if (cuentaCreateOpen()) {
        <app-crear-cuenta-dialog
          [open]="true"
          [clienteId]="cliente()!.id"
          [propiedades]="propiedades()"
          [cuenta]="cuentaEditing()"
          [cuentaFormNonce]="cuentaDialogNonce()"
          (openChange)="onCuentaDialogOpenChange($event)"
        />
      }

      @if (propiedadCreateOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" (click)="propiedadCreateOpen.set(false)"></div>
          <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 class="font-display text-lg font-bold text-foreground">
                {{ propiedadEditingId() ? 'Editar Propiedad' : 'Nueva Propiedad' }}
              </h2>
              <button
                type="button"
                (click)="closePropiedadModal()"
                class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form (ngSubmit)="guardarPropiedad()" [formGroup]="propiedadForm" class="p-6 space-y-4">
              @if (propiedadCreateError()) {
                <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {{ propiedadCreateError() }}
                </div>
              }

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Tipo de propiedad</label>
                <select
                  formControlName="tipo_propiedad"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  @for (opt of tipoPropiedadOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Identificador</label>
                <input
                  formControlName="identificador"
                  placeholder="Ej: Torre A - Apto 301"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Dirección</label>
                <input
                  formControlName="direccion"
                  placeholder="Conjunto / Dirección"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Notas (opcional)</label>
                <textarea
                  formControlName="notas"
                  placeholder="Notas adicionales"
                  rows="3"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Saldo inicial (COP)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  formControlName="saldo_inicial"
                  placeholder="Ej: 250000"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Inicio del cobro (opcional)</label>
                <input
                  type="date"
                  formControlName="fecha_inicio_cobro"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p class="mt-1 text-xs text-muted-foreground">
                  Fecha que el sistema registra como inicio de cobro para esta unidad. Déjala vacía si no aplica.
                </p>
              </div>

              <div class="flex gap-3 pt-2">
                <button
                  type="button"
                  (click)="closePropiedadModal()"
                  class="flex-1 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="propiedadCreateLoading() || propiedadForm.invalid"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {{ propiedadEditingId() ? 'Guardar cambios' : 'Guardar Propiedad' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (deleteConfirmOpen() && propiedadToDelete()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" (click)="cancelDeletePropiedad()"></div>
          <div class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div class="mb-4 flex items-start gap-3">
              <div class="rounded-xl bg-destructive/10 p-2 text-destructive">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              </div>
              <div>
                <h3 class="font-display text-lg font-bold text-foreground">Confirmar eliminacion</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  Vas a eliminar la propiedad <span class="font-medium text-foreground">"{{ propiedadToDelete()!.identificador }}"</span>.
                </p>
                <p class="mt-1 text-xs text-destructive/90">Esta accion no se puede deshacer.</p>
              </div>
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                (click)="cancelDeletePropiedad()"
                class="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmDeletePropiedad()"
                class="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      }
      @if (deleteCuentaConfirmOpen() && cuentaToDelete()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" (click)="cancelDeleteCuenta()"></div>
          <div class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div class="mb-4 flex items-start gap-3">
              <div class="rounded-xl bg-destructive/10 p-2 text-destructive">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              </div>
              <div>
                <h3 class="font-display text-lg font-bold text-foreground">Confirmar eliminacion</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  Vas a eliminar la cuenta <span class="font-medium text-foreground">"{{ cuentaToDelete()!.numero_cuenta }}"</span>.
                </p>
                <p class="mt-1 text-xs text-destructive/90">Esta accion no se puede deshacer.</p>
              </div>
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                (click)="cancelDeleteCuenta()"
                class="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmDeleteCuenta()"
                class="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class ClienteDetailPage {
  private readonly fb = inject(FormBuilder);
  cuentaCreateOpen = signal(false);
  propiedadCreateOpen = signal(false);
  propiedadEditingId = signal<string | null>(null);
  propiedadCreateLoading = signal(false);
  propiedadCreateError = signal<string | null>(null);
  cuentaEditing = signal<Cuenta | null>(null);
  /** Se incrementa en cada apertura del modal para forzar hidratar el formulario con los datos actuales. */
  cuentaDialogNonce = signal(0);
  deleteCuentaConfirmOpen = signal(false);
  cuentaToDelete = signal<Cuenta | null>(null);
  deleteConfirmOpen = signal(false);
  propiedadToDelete = signal<Propiedad | null>(null);

  tipoPropiedadOptions: Array<{ value: TipoPropiedad; label: string }> = [
    { value: 'apartamento', label: 'APARTAMENTO' },
    { value: 'oficina', label: 'OFICINA' },
    { value: 'local', label: 'LOCAL' },
    { value: 'casa', label: 'CASA' },
    { value: 'bodega', label: 'BODEGA' },
    { value: 'garaje', label: 'GARAJE' },
    { value: 'parqueadero', label: 'PARQUEADERO' },
    { value: 'otro', label: 'OTRO' },
  ];

  propiedadForm = this.fb.group({
    tipo_propiedad: ['apartamento' as TipoPropiedad, Validators.required],
    identificador: ['', Validators.required],
    direccion: ['', Validators.required],
    notas: [''],
    saldo_inicial: [0, [Validators.required, Validators.min(0)]],
    fecha_inicio_cobro: [''],
  });

  clientReportOpen = signal(false);
  propReportOpen = signal(false);
  selectedProp = signal<Propiedad | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private id = computed(() => this.route.snapshot.paramMap.get('id')!);
  cliente = computed(() => this.data.getClienteById(this.id()));
  propiedades = computed(() =>
    this.id() ? this.data.getPropiedadesByCliente(this.id()) : []
  );
  cuentas = computed(() =>
    this.id() ? this.data.getCuentasByCliente(this.id()) : []
  );
  totalMonto = computed(() =>
    this.propiedades().reduce((sum, p) => sum + this.data.getDeudaActualParaPropiedad(p), 0)
  );

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
      await Promise.all([
        this.data.loadCliente(id),
        this.data.loadPropiedadesByCliente(id),
        this.data.loadCuentasByCliente(id),
      ]);
    } catch {
      this.error.set('No se pudo cargar el detalle del cliente.');
    } finally {
      this.loading.set(false);
    }
  }

  openPropReport(p: Propiedad): void {
    this.selectedProp.set(p);
    this.propReportOpen.set(true);
  }

  openNuevaPropiedad(): void {
    this.propiedadEditingId.set(null);
    this.propiedadCreateError.set(null);
    this.propiedadForm.reset({
      tipo_propiedad: 'apartamento' as TipoPropiedad,
      identificador: '',
      direccion: '',
      notas: '',
      saldo_inicial: 0,
      fecha_inicio_cobro: '',
    });
    this.propiedadCreateOpen.set(true);
  }

  openNuevaCuenta(): void {
    this.cuentaEditing.set(null);
    this.cuentaDialogNonce.update((n) => n + 1);
    this.cuentaCreateOpen.set(true);
  }

  editarPropiedad(propiedad: Propiedad): void {
    this.propiedadEditingId.set(propiedad.id);
    this.propiedadCreateError.set(null);
    this.propiedadForm.reset({
      tipo_propiedad: propiedad.tipo_propiedad,
      identificador: propiedad.identificador,
      direccion: propiedad.direccion,
      notas: propiedad.notas ?? '',
      saldo_inicial: Number(propiedad.saldo_inicial ?? propiedad.monto_a_la_fecha),
      fecha_inicio_cobro: propiedad.fecha_inicio_cobro?.trim().slice(0, 10) ?? '',
    });
    this.propiedadCreateOpen.set(true);
  }

  async eliminarPropiedad(propiedad: Propiedad): Promise<void> {
    this.propiedadToDelete.set(propiedad);
    this.deleteConfirmOpen.set(true);
  }

  editarCuenta(cuenta: Cuenta): void {
    this.cuentaEditing.set(cuenta);
    this.cuentaDialogNonce.update((n) => n + 1);
    this.cuentaCreateOpen.set(true);
  }

  async eliminarCuenta(cuenta: Cuenta): Promise<void> {
    this.cuentaToDelete.set(cuenta);
    this.deleteCuentaConfirmOpen.set(true);
  }

  cancelDeleteCuenta(): void {
    this.deleteCuentaConfirmOpen.set(false);
    this.cuentaToDelete.set(null);
  }

  async confirmDeleteCuenta(): Promise<void> {
    const cuenta = this.cuentaToDelete();
    if (!cuenta) return;
    this.error.set(null);
    try {
      await this.data.deleteCuenta(cuenta.id, cuenta.cliente_id);
      this.cancelDeleteCuenta();
    } catch {
      this.error.set('No se pudo eliminar la cuenta. Intenta nuevamente.');
    }
  }

  onCuentaDialogOpenChange(open: boolean): void {
    this.cuentaCreateOpen.set(open);
    if (!open) {
      this.cuentaEditing.set(null);
    }
  }

  cancelDeletePropiedad(): void {
    this.deleteConfirmOpen.set(false);
    this.propiedadToDelete.set(null);
  }

  async confirmDeletePropiedad(): Promise<void> {
    const propiedad = this.propiedadToDelete();
    if (!propiedad) return;

    this.error.set(null);
    try {
      await this.data.deletePropiedad(propiedad.id, propiedad.cliente_id);
      this.cancelDeletePropiedad();
    } catch {
      this.error.set('No se pudo eliminar la propiedad. Intenta nuevamente.');
    }
  }

  closePropiedadModal(): void {
    this.propiedadCreateOpen.set(false);
    this.propiedadEditingId.set(null);
  }

  async guardarPropiedad(): Promise<void> {
    const clienteId = this.id();
    if (!clienteId) return;
    if (this.propiedadForm.invalid) {
      this.propiedadForm.markAllAsTouched();
      return;
    }
    this.propiedadCreateError.set(null);
    this.propiedadCreateLoading.set(true);
    try {
      const saldoInicial = Math.max(0, Number(this.propiedadForm.value.saldo_inicial ?? 0));
      const fechaRaw = this.propiedadForm.value.fecha_inicio_cobro;
      const fecha_inicio_cobro =
        typeof fechaRaw === 'string' && fechaRaw.trim() !== ''
          ? fechaRaw.trim().slice(0, 10)
          : null;
      const commonPayload: UpdatePropiedadPayload = {
        tipo_propiedad: this.propiedadForm.value.tipo_propiedad as TipoPropiedad,
        identificador: this.propiedadForm.value.identificador ?? '',
        direccion: this.propiedadForm.value.direccion ?? '',
        notas: (this.propiedadForm.value.notas ?? '').trim(),
        saldo_inicial: saldoInicial,
        fecha_inicio_cobro,
      };
      const editingId = this.propiedadEditingId();
      if (editingId) {
        await this.data.updatePropiedad(editingId, commonPayload);
      } else {
        const payload: CreatePropiedadPayload = {
          cliente_id: clienteId,
          ...commonPayload,
        };
        await this.data.createPropiedad(payload);
      }
      this.closePropiedadModal();
      this.propiedadForm.reset({
        tipo_propiedad: 'apartamento' as TipoPropiedad,
        identificador: '',
        direccion: '',
        notas: '',
        saldo_inicial: 0,
        fecha_inicio_cobro: '',
      });
    } catch (err) {
      const backendMessage =
        err instanceof HttpErrorResponse
          ? (err.error?.message ?? err.error?.code ?? err.message)
          : null;
      const isContractError =
        typeof backendMessage === 'string' &&
        (backendMessage.includes('saldo_inicial') || backendMessage.includes('unknown') || backendMessage.includes('Unexpected'));
      this.propiedadCreateError.set(
        !this.propiedadEditingId() && isContractError
          ? 'No se pudo crear la propiedad porque el backend no reconoce el campo "saldo_inicial".'
          : this.propiedadEditingId()
            ? 'No se pudo editar la propiedad. Verifica los datos e intenta nuevamente.'
            : 'No se pudo crear la propiedad. Verifica los datos e intenta nuevamente.'
      );
    } finally {
      this.propiedadCreateLoading.set(false);
    }
  }

  protected resumenCobro(p: Propiedad) {
    return this.data.getResumenMoraCobroParaPropiedad(p);
  }
}
