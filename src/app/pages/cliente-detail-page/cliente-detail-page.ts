import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ClientReportDialog } from '../../components/client-report-dialog/client-report-dialog';
import { ReportPreviewDialog } from '../../components/report-preview-dialog/report-preview-dialog';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import type { Propiedad } from '../../core/models';

@Component({
  selector: 'app-cliente-detail-page',
  standalone: true,
  imports: [RouterLink, BalanceCard, StatusBadge, ClientReportDialog, ReportPreviewDialog],
  template: `
    @if (!cliente()) {
      <div class="p-12 text-center text-muted-foreground">
        Cliente no encontrado.
        <a routerLink="/dashboard" class="ml-4 rounded-xl border border-border px-4 py-2">Volver</a>
      </div>
    } @else {
      <div class="min-h-screen pb-12">
        <div class="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
          <div class="max-w-6xl mx-auto">
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

        <div class="max-w-6xl mx-auto px-8 -mt-6 space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 bg-card rounded-2xl shadow-card p-6 border border-border/50">
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
                label="Monto a la fecha"
                [amount]="totalMonto()"
                variant="highlight"
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

          <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-display font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                Propiedades del Cliente
              </h2>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Añadir Propiedad
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Propiedad</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Identificador</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Monto a la fecha</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of propiedades(); track p.id) {
                    <tr class="border-b border-border/50 hover:bg-secondary/50">
                      <td class="px-4 py-3 text-muted-foreground">{{ p.direccion }}</td>
                      <td class="px-4 py-3">
                        <app-status-badge [label]="data.tipoPropiedadLabels[p.tipo_propiedad]" variant="juridica" />
                      </td>
                      <td class="px-4 py-3 font-medium">{{ p.identificador }}</td>
                      <td class="px-4 py-3 text-right tabular-nums">
                        {{ data.formatCurrency(p.monto_a_la_fecha) }}
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-1">
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
                            class="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            type="button"
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
            <h2 class="font-display font-bold text-lg mb-4">Cuentas del Cliente</h2>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cuenta</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cu of cuentas(); track cu.id) {
                    <tr class="border-b border-border/50">
                      <td class="px-4 py-3 font-mono text-sm">{{ cu.numero_cuenta }}</td>
                      <td class="px-4 py-3">
                        <app-status-badge [label]="data.tipoCuentaLabels[cu.tipo]" variant="juridica" />
                      </td>
                      <td class="px-4 py-3">
                        <app-status-badge [label]="data.estadoCuentaLabels[cu.estado]" [variant]="cu.estado" />
                      </td>
                      <td class="px-4 py-3 text-muted-foreground">{{ data.etapaProcesoLabels[cu.etapa_proceso] }}</td>
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
    }
  `,
})
export class ClienteDetailPage {
  clientReportOpen = signal(false);
  propReportOpen = signal(false);
  selectedProp = signal<Propiedad | null>(null);

  private id = computed(() => this.route.snapshot.paramMap.get('id')!);
  cliente = computed(() => this.data.getClienteById(this.id()));
  propiedades = computed(() =>
    this.id() ? this.data.getPropiedadesByCliente(this.id()) : []
  );
  cuentas = computed(() =>
    this.id() ? this.data.getCuentasByCliente(this.id()) : []
  );
  totalMonto = computed(() =>
    this.propiedades().reduce((sum, p) => sum + p.monto_a_la_fecha, 0)
  );

  constructor(
    private route: ActivatedRoute,
    protected data: DataService
  ) {}

  openPropReport(p: Propiedad): void {
    this.selectedProp.set(p);
    this.propReportOpen.set(true);
  }
}
