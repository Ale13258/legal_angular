import { Component, computed, inject, signal, ChangeDetectorRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DataService,
  type CreateCuentaPayload,
  type UpdateClientePayload,
  type UpdateCuentaPayload,
} from '../../core/services/data.service';
import { ClientReportDialog } from '../../components/client-report-dialog/client-report-dialog';
import { CrearProcesoLegalDialog } from '../../components/crear-proceso-legal-dialog/crear-proceso-legal-dialog';
import { ReportPreviewDialog } from '../../components/report-preview-dialog/report-preview-dialog';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { DeudorCell } from '../../shared/deudor-cell/deudor-cell';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { fadeInUpStagger } from '../../core/animations/animations';
import type { ProcesoLegal, DeudorCobro, Cuenta, TipoPersona, TipoCuenta } from '../../core/models';
import { formatMontoColombiano } from '../../core/utils/format-monto-colombiano';
import { resolveDeudores } from '../../core/utils/normalize-cuenta-deudores';
import { parseMontoColombiano } from '../../core/utils/parse-monto-colombiano';

const MAX_DEUDORES = 10;
const MAX_EMAILS_POR_DEUDOR = 5;

@Component({
  selector: 'app-cliente-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    BalanceCard,
    DeudorCell,
    StatusBadge,
    ClientReportDialog,
    CrearProcesoLegalDialog,
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
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 class="font-display font-bold text-lg flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Información del Cliente
                </h2>
                <button
                  type="button"
                  (click)="openEditarCliente()"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  Editar
                </button>
              </div>
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
                (click)="openNuevaCuenta()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Añadir Propiedad
              </button>
            </div>
            <div class="table-wrap">
              <table class="w-full min-w-[72rem] table-fixed">
                <colgroup>
                  <col class="w-[14%]" />
                  <col class="w-[12%]" />
                  <col class="w-[11%]" />
                  <col class="w-[13%]" />
                  <col class="w-[13%]" />
                  <col class="w-[11%]" />
                  <col class="w-[12%]" />
                  <col class="w-[14%]" />
                </colgroup>
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Propiedad</th>
                    <th
                      class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap"
                      title="Días en mora y etapa. Pasa el cursor para ver alta en app, inicio y fin de cobro."
                    >
                      Edad en mora
                    </th>
                    <th class="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Valor inicial</th>
                    <th class="text-right px-3 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Deuda a la fecha</th>
                    <th class="text-right px-1 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of cuentas(); track p.id; let i = $index) {
                    <tr
                      [@fadeInUpStagger]="{ value: '', params: { delay: i * 50, duration: 200, offset: 5, ease: 'ease-out' } }"
                      class="border-b border-border/50 hover:bg-secondary/50"
                    >
                      <td class="px-4 py-3 text-muted-foreground">
                        <div class="truncate" [title]="p.direccion">{{ p.direccion }}</div>
                      </td>
                      <td class="px-4 py-3 overflow-hidden">
                        <app-status-badge [label]="data.tipoCuentaLabels[p.tipo_cuenta]" [variant]="p.tipo_cuenta" />
                      </td>
                      <td class="px-4 py-3 font-medium overflow-hidden">
                        <div class="truncate" [title]="p.identificador">{{ p.identificador }}</div>
                      </td>
                      <td class="deudor-col px-4 py-3 text-sm align-top">
                        <app-deudor-cell [cuenta]="p" />
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
                        {{ data.formatCurrency(data.getTotalCobradoParaCuenta(p)) }}
                      </td>
                      <td class="px-3 py-3 text-right tabular-nums whitespace-nowrap align-middle font-semibold">
                        {{ data.formatDeuda(data.getDeudaActualParaCuenta(p)) }}
                      </td>
                      <td class="px-1 py-3 whitespace-nowrap align-middle text-right">
                        <div class="inline-flex items-center justify-end gap-0 shrink-0">
                          <button
                            type="button"
                            (click)="openPropReport(p)"
                            class="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Informe"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                          </button>
                          <a
                            [routerLink]="['/propiedades', p.id]"
                            class="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Ver detalle"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </a>
                          <button
                            type="button"
                            (click)="editarCuenta(p)"
                            class="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            type="button"
                            (click)="eliminarCuenta(p)"
                            class="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                (click)="openNuevoProcesoLegal()"
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
                  @for (cu of procesosLegales(); track cu.id) {
                    <tr class="border-b border-border/50">
                      <td class="px-4 py-3 font-mono text-sm">{{ cu.numero_cuenta }}</td>
                      <td class="px-4 py-3">
                        <app-status-badge
                          [label]="data.tipoProcesoLegalLabels[cu.tipo]"
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
                        <app-status-badge [label]="data.estadoProcesoLegalLabels[cu.estado]" [variant]="cu.estado" />
                      </td>
                      <td class="px-4 py-3 text-muted-foreground">{{ data.etapaProcesoLabels[cu.etapa_proceso] }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            (click)="editarProcesoLegal(cu)"
                            class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Editar cuenta"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            type="button"
                            (click)="eliminarProcesoLegal(cu)"
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
          [cuentas]="cuentas()"
          (openChange)="clientReportOpen.set($event)"
        />
      }
      @if (propReportOpen() && selectedProp()) {
        <app-report-preview-dialog
          [open]="true"
          [cuenta]="selectedProp()!"
          (openChange)="propReportOpen.set($event)"
        />
      }

      @if (procesoLegalDialogOpen()) {
        <app-crear-proceso-legal-dialog
          [open]="true"
          [clienteId]="cliente()!.id"
          [cuentas]="cuentas()"
          [cuenta]="procesoLegalEditing()"
          [cuentaFormNonce]="procesoLegalDialogNonce()"
          (openChange)="onProcesoLegalDialogOpenChange($event)"
        />
      }

      @if (cuentaCreateOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" (click)="cuentaCreateOpen.set(false)"></div>
          <div
            class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 class="font-display text-lg font-bold text-foreground">
                {{ cuentaEditingId() ? 'Editar Propiedad' : 'Nueva Propiedad' }}
              </h2>
              <button
                type="button"
                (click)="closeCuentaModal()"
                class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form (ngSubmit)="guardarCuenta()" [formGroup]="cuentaForm" class="p-6 space-y-4">
              @if (cuentaCreateError()) {
                <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {{ cuentaCreateError() }}
                </div>
              }

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Tipo de cuenta</label>
                <select
                  formControlName="tipo_cuenta"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  @for (opt of tipoCuentaOptions; track opt.value) {
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

              <div class="border-t border-border pt-4 space-y-4" formArrayName="deudores">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">Usuario(s) a cobrar</h3>
                  <p class="mt-1 text-xs text-muted-foreground">
                    Puedes agregar más de un deudor y varios correos por deudor. A estos correos se enviarán las notificaciones de cobro.
                  </p>
                </div>

                @for (deudorCtrl of deudoresControls(); track deudorCtrl; let di = $index) {
                  <div [formGroupName]="di" class="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-medium text-foreground">Deudor {{ di + 1 }}</p>
                      @if (deudoresArray.length > 1) {
                        <button
                          type="button"
                          (click)="removeDeudor(di)"
                          class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                        >
                          Quitar
                        </button>
                      }
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-foreground mb-1.5">Nombre completo / Razón social</label>
                      <input
                        formControlName="nombre"
                        placeholder="Nombre de quien se cobra"
                        class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-foreground mb-1.5">Tipo de persona</label>
                        <select
                          formControlName="tipo_persona"
                          class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="natural">Persona natural</option>
                          <option value="juridica">Persona jurídica</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-foreground mb-1.5">
                          {{ deudorCtrl.get('tipo_persona')?.value === 'natural' ? 'Cédula (CC)' : 'NIT' }}
                        </label>
                        <input
                          formControlName="documento"
                          [placeholder]="deudorCtrl.get('tipo_persona')?.value === 'natural' ? '1.023.456.789' : '900.123.456-7'"
                          class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div formArrayName="emails" class="space-y-3">
                      <label class="block text-sm font-medium text-foreground">Correos de notificación</label>
                      @for (emailCtrl of emailsControls(di); track emailCtrl; let ei = $index) {
                        <div class="flex gap-2">
                          <input
                            type="email"
                            [formControlName]="ei"
                            placeholder="correo@ejemplo.com"
                            class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          @if (emailsArray(di).length > 1) {
                            <button
                              type="button"
                              (click)="removeEmail(di, ei); $event.stopPropagation()"
                              class="shrink-0 rounded-xl border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-destructive"
                              aria-label="Quitar correo"
                            >
                              ×
                            </button>
                          }
                        </div>
                      }
                      <button
                        type="button"
                        (click)="addEmail(di); $event.stopPropagation()"
                        [disabled]="emailsArray(di).length >= maxEmailsPorDeudor"
                        class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        Agregar correo
                      </button>
                    </div>
                  </div>
                }

                <button
                  type="button"
                  (click)="addDeudor()"
                  [disabled]="deudoresArray.length >= maxDeudores"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Agregar deudor
                </button>
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Saldo inicial (COP)</label>
                <input
                  type="text"
                  inputmode="decimal"
                  formControlName="saldo_inicial"
                  placeholder="Ej: 9.565.879 o 9565879"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p class="mt-1 text-xs text-muted-foreground">
                  Base de la deuda (deuda = saldo inicial − pagos). Puedes corregirlo si hay inconsistencias.
                </p>
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
                  (click)="closeCuentaModal()"
                  class="flex-1 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="cuentaCreateLoading() || cuentaForm.invalid"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {{ cuentaEditingId() ? 'Guardar cambios' : 'Guardar Propiedad' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (deleteConfirmOpen() && cuentaToDelete()) {
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
                  Vas a eliminar la propiedad <span class="font-medium text-foreground">"{{ cuentaToDelete()!.identificador }}"</span>.
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
      @if (clienteEditOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" (click)="closeEditarCliente()"></div>
          <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 class="font-display text-lg font-bold text-foreground">Editar información del cliente</h2>
              <button
                type="button"
                (click)="closeEditarCliente()"
                class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form (ngSubmit)="guardarCliente()" [formGroup]="clienteForm" class="p-6 space-y-4">
              @if (clienteEditError()) {
                <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {{ clienteEditError() }}
                </div>
              }

              <div class="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
                <p>
                  <span class="font-medium text-foreground">Documento:</span>
                  {{ cliente()!.documento }}
                </p>
                <p>
                  <span class="font-medium text-foreground">Tipo:</span>
                  {{ cliente()!.tipo_persona === 'natural' ? 'Persona natural' : 'Persona jurídica' }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Nombre completo / Razón social</label>
                <input
                  formControlName="nombre"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1.5">Teléfono</label>
                  <input
                    formControlName="telefono"
                    class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    formControlName="email"
                    class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Dirección</label>
                <input
                  formControlName="direccion"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-foreground mb-1.5">Observaciones (opcional)</label>
                <textarea
                  formControlName="observaciones"
                  rows="3"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                ></textarea>
              </div>

              <div class="flex gap-3 pt-2">
                <button
                  type="button"
                  (click)="closeEditarCliente()"
                  class="flex-1 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="clienteEditLoading() || clienteForm.invalid"
                  class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (deleteProcesoLegalConfirmOpen() && procesoLegalToDelete()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50" (click)="cancelDeleteProcesoLegal()"></div>
          <div class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div class="mb-4 flex items-start gap-3">
              <div class="rounded-xl bg-destructive/10 p-2 text-destructive">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              </div>
              <div>
                <h3 class="font-display text-lg font-bold text-foreground">Confirmar eliminacion</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  Vas a eliminar la cuenta <span class="font-medium text-foreground">"{{ procesoLegalToDelete()!.numero_cuenta }}"</span>.
                </p>
                <p class="mt-1 text-xs text-destructive/90">Esta accion no se puede deshacer.</p>
              </div>
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                (click)="cancelDeleteProcesoLegal()"
                class="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmDeleteProcesoLegal()"
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
  private readonly cdr = inject(ChangeDetectorRef);
  /** Fuerza re-render del @for al mutar FormArrays anidados. */
  private readonly formArraysTick = signal(0);
  cuentaCreateOpen = signal(false);
  procesoLegalDialogOpen = signal(false);
  cuentaEditingId = signal<string | null>(null);
  cuentaEditing = signal<Cuenta | null>(null);
  cuentaCreateLoading = signal(false);
  cuentaCreateError = signal<string | null>(null);
  procesoLegalEditing = signal<ProcesoLegal | null>(null);
  /** Se incrementa en cada apertura del modal para forzar hidratar el formulario con los datos actuales. */
  procesoLegalDialogNonce = signal(0);
  deleteProcesoLegalConfirmOpen = signal(false);
  procesoLegalToDelete = signal<ProcesoLegal | null>(null);
  deleteConfirmOpen = signal(false);
  cuentaToDelete = signal<Cuenta | null>(null);

  tipoCuentaOptions: Array<{ value: TipoCuenta; label: string }> = [
    { value: 'apartamento', label: 'APARTAMENTO' },
    { value: 'oficina', label: 'OFICINA' },
    { value: 'local', label: 'LOCAL' },
    { value: 'casa', label: 'CASA' },
    { value: 'bodega', label: 'BODEGA' },
    { value: 'garaje', label: 'GARAJE' },
    { value: 'parqueadero', label: 'PARQUEADERO' },
    { value: 'otro', label: 'OTRO' },
  ];

  readonly maxDeudores = MAX_DEUDORES;
  readonly maxEmailsPorDeudor = MAX_EMAILS_POR_DEUDOR;

  cuentaForm = this.fb.group({
    tipo_cuenta: ['apartamento' as TipoCuenta, Validators.required],
    identificador: ['', Validators.required],
    direccion: ['', Validators.required],
    notas: [''],
    saldo_inicial: ['', Validators.required],
    fecha_inicio_cobro: [''],
    deudores: this.fb.array([this.createDeudorGroup()]),
  });

  get deudoresArray(): FormArray<FormGroup> {
    return this.cuentaForm.get('deudores') as FormArray<FormGroup>;
  }

  emailsArray(deudorIndex: number): FormArray<FormControl<string | null>> {
    return this.deudoresArray.at(deudorIndex).get('emails') as FormArray<FormControl<string | null>>;
  }

  /** Snapshot del FormArray para que @for detecte altas/bajas. */
  deudoresControls(): FormGroup[] {
    this.formArraysTick();
    return [...this.deudoresArray.controls];
  }

  /** Snapshot del FormArray para que @for detecte altas/bajas. */
  emailsControls(deudorIndex: number): FormControl<string | null>[] {
    this.formArraysTick();
    return [...this.emailsArray(deudorIndex).controls];
  }

  addDeudor(): void {
    if (this.deudoresArray.length >= MAX_DEUDORES) return;
    this.deudoresArray.push(this.createDeudorGroup());
    this.bumpFormArraysUi();
  }

  removeDeudor(index: number): void {
    if (this.deudoresArray.length <= 1) return;
    this.deudoresArray.removeAt(index);
    this.bumpFormArraysUi();
  }

  addEmail(deudorIndex: number): void {
    const emails = this.emailsArray(deudorIndex);
    if (emails.length >= MAX_EMAILS_POR_DEUDOR) return;
    emails.push(this.createEmailControl(''));
    this.bumpFormArraysUi();
  }

  removeEmail(deudorIndex: number, emailIndex: number): void {
    const emails = this.emailsArray(deudorIndex);
    if (emails.length <= 1) return;
    emails.removeAt(emailIndex);
    this.bumpFormArraysUi();
  }

  private bumpFormArraysUi(): void {
    this.formArraysTick.update((n) => n + 1);
    this.cdr.markForCheck();
  }

  private createEmailControl(value = ''): FormControl<string | null> {
    return this.fb.control(value, [Validators.required, Validators.email]);
  }

  private createDeudorGroup(deudor?: Partial<DeudorCobro>): FormGroup {
    const emails = (deudor?.emails?.length ? deudor.emails : ['']).map((e) =>
      this.createEmailControl(e)
    );
    return this.fb.group({
      nombre: [deudor?.nombre ?? '', Validators.required],
      tipo_persona: [(deudor?.tipo_persona ?? 'natural') as TipoPersona, Validators.required],
      documento: [deudor?.documento ?? '', Validators.required],
      emails: this.fb.array(emails),
    });
  }

  private setDeudoresForm(deudores: DeudorCobro[]): void {
    const list = deudores.length ? deudores : [{ nombre: '', tipo_persona: 'natural' as TipoPersona, documento: '', emails: [''] }];
    this.deudoresArray.clear();
    for (const d of list) {
      this.deudoresArray.push(this.createDeudorGroup(d));
    }
    this.bumpFormArraysUi();
  }

  private readDeudoresFromForm(): DeudorCobro[] {
    return this.deudoresArray.controls.map((group) => {
      const emailsCtrl = group.get('emails') as FormArray;
      const emails = emailsCtrl.controls
        .map((c) => String(c.value ?? '').trim())
        .filter(Boolean);
      return {
        nombre: String(group.get('nombre')?.value ?? '').trim(),
        tipo_persona: (group.get('tipo_persona')?.value ?? 'natural') as TipoPersona,
        documento: String(group.get('documento')?.value ?? '').trim(),
        emails,
      };
    });
  }

  clientReportOpen = signal(false);
  propReportOpen = signal(false);
  selectedProp = signal<Cuenta | null>(null);
  clienteEditOpen = signal(false);
  clienteEditLoading = signal(false);
  clienteEditError = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  clienteForm = this.fb.group({
    nombre: ['', Validators.required],
    telefono: [''],
    email: [''],
    direccion: [''],
    observaciones: [''],
  });

  private id = computed(() => this.route.snapshot.paramMap.get('id')!);
  cliente = computed(() => this.data.getClienteById(this.id()));
  cuentas = computed(() =>
    this.id() ? this.data.getCuentasByCliente(this.id()) : []
  );
  procesosLegales = computed(() =>
    this.id() ? this.data.getProcesosLegalesByCliente(this.id()) : []
  );
  totalMonto = computed(() =>
    this.cuentas().reduce((sum, p) => sum + this.data.getDeudaActualParaCuenta(p), 0)
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
      const [, cuentas] = await Promise.all([
        this.data.loadCliente(id),
        this.data.loadCuentasByCliente(id),
        this.data.loadProcesosLegalesByCliente(id),
      ]);
      const propiedadesDetalle = await this.data.loadCuentaDetallesForCuentas(cuentas);
      await this.data.loadHistorialesForCuentas(propiedadesDetalle);
    } catch {
      this.error.set('No se pudo cargar el detalle del cliente.');
    } finally {
      this.loading.set(false);
    }
  }

  openPropReport(p: Cuenta): void {
    this.selectedProp.set(p);
    this.propReportOpen.set(true);
  }

  openEditarCliente(): void {
    const c = this.cliente();
    if (!c) return;
    this.clienteEditError.set(null);
    this.clienteForm.reset({
      nombre: c.nombre,
      telefono: c.telefono ?? '',
      email: c.email ?? '',
      direccion: c.direccion ?? '',
      observaciones: c.observaciones ?? '',
    });
    this.clienteEditOpen.set(true);
  }

  closeEditarCliente(): void {
    this.clienteEditOpen.set(false);
    this.clienteEditError.set(null);
  }

  async guardarCliente(): Promise<void> {
    const id = this.id();
    if (!id || this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }
    this.clienteEditError.set(null);
    this.clienteEditLoading.set(true);
    try {
      const payload: UpdateClientePayload = {
        nombre: this.clienteForm.value.nombre ?? '',
        telefono: this.clienteForm.value.telefono ?? '',
        email: this.clienteForm.value.email ?? '',
        direccion: this.clienteForm.value.direccion ?? '',
        observaciones: (this.clienteForm.value.observaciones ?? '').trim(),
      };
      await this.data.updateCliente(id, payload);
      this.closeEditarCliente();
    } catch {
      this.clienteEditError.set(
        'No se pudo guardar la información del cliente. Verifica los datos e intenta nuevamente.'
      );
    } finally {
      this.clienteEditLoading.set(false);
    }
  }

  openNuevaCuenta(): void {
    this.cuentaEditingId.set(null);
    this.cuentaEditing.set(null);
    this.cuentaCreateError.set(null);
    this.restoreSaldoInicialValidators();
    this.resetCuentaFormEmpty();
    this.cuentaCreateOpen.set(true);
  }

  openNuevoProcesoLegal(): void {
    this.procesoLegalEditing.set(null);
    this.procesoLegalDialogNonce.update((n) => n + 1);
    this.procesoLegalDialogOpen.set(true);
  }

  editarCuenta(cuenta: Cuenta): void {
    this.cuentaEditingId.set(cuenta.id);
    this.cuentaEditing.set(cuenta);
    this.cuentaCreateError.set(null);
    this.restoreSaldoInicialValidators();
    this.cuentaForm.patchValue({
      tipo_cuenta: cuenta.tipo_cuenta,
      identificador: cuenta.identificador,
      direccion: cuenta.direccion,
      notas: cuenta.notas ?? '',
      saldo_inicial: formatMontoColombiano(this.data.getTotalCobradoParaCuenta(cuenta)),
      fecha_inicio_cobro: cuenta.fecha_inicio_cobro?.trim().slice(0, 10) ?? '',
    });
    this.setDeudoresForm(resolveDeudores(cuenta));
    this.cuentaCreateOpen.set(true);
  }

  async eliminarCuenta(cuenta: Cuenta): Promise<void> {
    this.cuentaToDelete.set(cuenta);
    this.deleteConfirmOpen.set(true);
  }

  editarProcesoLegal(proceso: ProcesoLegal): void {
    this.procesoLegalEditing.set(proceso);
    this.procesoLegalDialogNonce.update((n) => n + 1);
    this.procesoLegalDialogOpen.set(true);
  }

  async eliminarProcesoLegal(cuenta: ProcesoLegal): Promise<void> {
    this.procesoLegalToDelete.set(cuenta);
    this.deleteProcesoLegalConfirmOpen.set(true);
  }

  cancelDeleteProcesoLegal(): void {
    this.deleteProcesoLegalConfirmOpen.set(false);
    this.procesoLegalToDelete.set(null);
  }

  async confirmDeleteProcesoLegal(): Promise<void> {
    const cuenta = this.procesoLegalToDelete();
    if (!cuenta) return;
    this.error.set(null);
    try {
      await this.data.deleteProcesoLegal(cuenta.id, cuenta.cliente_id);
      this.cancelDeleteProcesoLegal();
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : null;
      this.error.set(
        status === 404
          ? 'El servidor no tiene habilitado el borrado de cuentas (o la cuenta ya no existe). Revisa el despliegue del backend.'
          : 'No se pudo eliminar la cuenta. Intenta nuevamente.'
      );
    }
  }

  onProcesoLegalDialogOpenChange(open: boolean): void {
    this.procesoLegalDialogOpen.set(open);
    if (!open) {
      this.procesoLegalEditing.set(null);
    }
  }

  cancelDeleteCuenta(): void {
    this.deleteConfirmOpen.set(false);
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

  closeCuentaModal(): void {
    this.cuentaCreateOpen.set(false);
    this.cuentaEditingId.set(null);
    this.cuentaEditing.set(null);
    this.cuentaCreateError.set(null);
    this.restoreSaldoInicialValidators();
    this.resetCuentaFormEmpty();
  }

  async guardarCuenta(): Promise<void> {
    const clienteId = this.id();
    if (!clienteId) return;
    if (this.cuentaForm.invalid) {
      this.cuentaForm.markAllAsTouched();
      return;
    }
    this.cuentaCreateError.set(null);
    this.cuentaCreateLoading.set(true);
    try {
      const editingId = this.cuentaEditingId();
      const parsed = parseMontoColombiano(this.cuentaForm.value.saldo_inicial);
      if (!Number.isFinite(parsed) || parsed < 0) {
        this.cuentaCreateError.set('Ingresa un saldo inicial válido.');
        return;
      }
      const fechaRaw = this.cuentaForm.value.fecha_inicio_cobro;
      const fecha_inicio_cobro =
        typeof fechaRaw === 'string' && fechaRaw.trim() !== ''
          ? fechaRaw.trim().slice(0, 10)
          : null;
      const deudores = this.readDeudoresFromForm();
      if (!deudores.length || deudores.some((d) => !d.nombre || !d.documento || !d.emails.length)) {
        this.cuentaCreateError.set('Completa los datos de cada deudor (nombre, documento y al menos un correo).');
        return;
      }
      const principal = deudores[0];
      const commonPayload: UpdateCuentaPayload = {
        tipo_cuenta: this.cuentaForm.value.tipo_cuenta as TipoCuenta,
        identificador: this.cuentaForm.value.identificador ?? '',
        direccion: this.cuentaForm.value.direccion ?? '',
        notas: (this.cuentaForm.value.notas ?? '').trim(),
        saldo_inicial: parsed,
        fecha_inicio_cobro,
        deudores,
        cobro_nombre: principal.nombre,
        cobro_tipo_persona: principal.tipo_persona,
        cobro_documento: principal.documento,
        cobro_email: principal.emails[0] ?? '',
      };
      if (editingId) {
        await this.data.updateCuenta(editingId, commonPayload);
      } else {
        const payload: CreateCuentaPayload = {
          cliente_id: clienteId,
          tipo_cuenta: commonPayload.tipo_cuenta!,
          identificador: commonPayload.identificador!,
          direccion: commonPayload.direccion!,
          notas: commonPayload.notas!,
          saldo_inicial: parsed,
          fecha_inicio_cobro: commonPayload.fecha_inicio_cobro,
          deudores,
          cobro_nombre: commonPayload.cobro_nombre!,
          cobro_tipo_persona: commonPayload.cobro_tipo_persona!,
          cobro_documento: commonPayload.cobro_documento!,
          cobro_email: commonPayload.cobro_email!,
        };
        await this.data.createCuenta(payload);
      }
      this.closeCuentaModal();
    } catch (err) {
      const backendMessage =
        err instanceof HttpErrorResponse
          ? (err.error?.message ?? err.error?.code ?? err.message)
          : null;
      const isContractError =
        typeof backendMessage === 'string' &&
        (backendMessage.includes('saldo_inicial') || backendMessage.includes('unknown') || backendMessage.includes('Unexpected'));
      this.cuentaCreateError.set(
        !this.cuentaEditingId() && isContractError
          ? 'No se pudo crear la cuenta porque el backend no reconoce el campo "saldo_inicial".'
          : this.cuentaEditingId()
            ? 'No se pudo editar la cuenta. Verifica los datos e intenta nuevamente.'
            : 'No se pudo crear la cuenta. Verifica los datos e intenta nuevamente.'
      );
    } finally {
      this.cuentaCreateLoading.set(false);
    }
  }

  protected resumenCobro(p: Cuenta) {
    return this.data.getResumenMoraCobroParaCuenta(p);
  }

  private resetCuentaFormEmpty(): void {
    this.cuentaForm.patchValue({
      tipo_cuenta: 'apartamento' as TipoCuenta,
      identificador: '',
      direccion: '',
      notas: '',
      saldo_inicial: '',
      fecha_inicio_cobro: '',
    });
    this.setDeudoresForm([]);
    this.cuentaForm.markAsPristine();
    this.cuentaForm.markAsUntouched();
  }

  private restoreSaldoInicialValidators(): void {
    this.cuentaForm.get('saldo_inicial')?.setValidators([Validators.required]);
    this.cuentaForm.get('saldo_inicial')?.updateValueAndValidity();
  }
}
