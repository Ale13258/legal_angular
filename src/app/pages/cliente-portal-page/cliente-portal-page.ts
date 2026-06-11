import { Component, computed, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration } from 'chart.js';
import { downloadClientGeneralReportPdf } from '../../core/report-export/client-general-report-pdf';
import type { Propiedad } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { fadeInUp, fadeInUpStagger } from '../../core/animations/animations';

@Component({
  selector: 'app-cliente-portal-page',
  standalone: true,
  imports: [BaseChartDirective, BalanceCard, StatusBadge],
  animations: [fadeInUp, fadeInUpStagger],
  template: `
    <div class="min-h-screen page-container py-8">
      @if (error()) {
        <div class="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ error() }}
        </div>
      }
      @if (loading()) {
        <div class="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Cargando información...
        </div>
      }
      @if (cliente(); as c) {
        <div [@fadeInUp]="animParams" class="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 class="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              Informe General
            </h1>
            <p class="text-muted-foreground mb-1">{{ c.nombre }}</p>
            <p class="text-sm text-muted-foreground">
              {{ c.documento }} · {{ c.email }} · {{ c.telefono }}
            </p>
            <p class="text-xs text-muted-foreground mt-2">Fecha del informe: {{ fechaInforme }}</p>
          </div>
          <button
            type="button"
            (click)="downloadPdf()"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-medium hover:opacity-90 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
            Descargar PDF
          </button>
        </div>

        <section class="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <app-balance-card label="Total cobrado" [amount]="totalCobrado()" icon="cobrado" [accentLeft]="true" />
          <app-balance-card label="Total pagado" [amount]="totalPagado()" icon="pagado" [accentLeft]="true" />
          <app-balance-card
            label="Deuda a la fecha"
            [amount]="totalDeuda()"
            variant="highlight"
            icon="saldo"
            [accentLeft]="true"
          />
        </section>

        <section class="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-card rounded-2xl shadow-card border border-border/50 p-4 sm:p-6 min-w-0">
            <h2 class="font-display font-semibold text-lg text-foreground mb-4">Cobrado vs Pagado por periodo</h2>
            @if (hasHistorialChart()) {
              <div class="h-[260px]">
                <canvas baseChart [data]="barCobradoPagadoData()" [options]="barOptions" type="bar"></canvas>
              </div>
            } @else {
              <div class="h-[260px] rounded-xl bg-muted/30 flex items-center justify-center text-sm text-muted-foreground text-center px-6">
                No hay movimientos para graficar.
              </div>
            }
          </div>

          <div class="bg-card rounded-2xl shadow-card border border-border/50 p-4 sm:p-6 min-w-0">
            <h2 class="font-display font-semibold text-lg text-foreground mb-4">Deuda por propiedad</h2>
            @if (propiedades().length > 0) {
              <div class="h-[260px]">
                <canvas baseChart [data]="barDeudaPropiedadData()" [options]="barDeudaOptions" type="bar"></canvas>
              </div>
            } @else {
              <div class="h-[260px] rounded-xl bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                No hay propiedades registradas.
              </div>
            }
          </div>

        </section>

        <section class="mb-10">
          <h2 class="font-display font-semibold text-lg text-foreground mb-4">Propiedades</h2>
          <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
            <div class="table-wrap overflow-x-auto">
              <table class="w-full min-w-[820px]">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Identificador</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Dirección</th>
                    <th
                      class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase max-w-[13rem]"
                      title="Días, etapa y fechas al pasar el cursor"
                    >
                      Edad en mora
                    </th>
                    <th class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor inicial</th>
                    <th class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Deuda a la fecha</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of propiedades(); track p.id; let i = $index) {
                    <tr [@fadeInUpStagger]="stagger(i)" class="border-b border-border/50">
                      <td class="px-4 sm:px-6 py-3">
                        <app-status-badge
                          [label]="data.tipoPropiedadLabels[p.tipo_propiedad]"
                          [variant]="p.tipo_propiedad"
                        />
                      </td>
                      <td class="px-4 sm:px-6 py-3 font-medium">{{ p.identificador }}</td>
                      <td class="px-4 sm:px-6 py-3 text-muted-foreground text-sm">{{ p.direccion }}</td>
                      <td
                        class="px-4 sm:px-6 py-3 text-right text-sm align-top max-w-[13rem]"
                        [title]="data.formatResumenMoraTooltip(resumenCobro(p))"
                      >
                        <div class="font-medium tabular-nums">
                          {{ data.formatDiasMora(resumenCobro(p).edad_mora_dias) }}
                        </div>
                        <div class="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                          {{ data.formatEtapaCobranzaCorta(resumenCobro(p).edad_mora_dias) }}
                        </div>
                      </td>
                      <td class="px-4 sm:px-6 py-3 text-right font-mono text-sm">
                        {{ data.formatCurrency(data.getTotalCobradoParaPropiedad(p)) }}
                      </td>
                      <td class="px-4 sm:px-6 py-3 text-right font-mono text-sm font-semibold text-foreground">
                        {{ data.formatDeuda(data.getDeudaActualParaPropiedad(p)) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (propiedades().length === 0) {
              <p class="text-center py-8 text-muted-foreground text-sm">No hay propiedades registradas.</p>
            }
          </div>
        </section>

        <section class="mb-10">
          <h2 class="font-display font-semibold text-lg text-foreground mb-4">Cuentas</h2>
          <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
            <div class="table-wrap overflow-x-auto">
              <table class="w-full min-w-[480px]">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Nº cuenta</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cu of cuentas(); track cu.id; let i = $index) {
                    <tr [@fadeInUpStagger]="stagger(i + 20)" class="border-b border-border/50">
                      <td class="px-4 sm:px-6 py-3 font-mono text-sm">{{ cu.numero_cuenta }}</td>
                      <td class="px-4 sm:px-6 py-3">
                        <app-status-badge
                          [label]="data.tipoCuentaLabels[cu.tipo]"
                          [variant]="cu.tipo === 'juridica' ? 'juridica' : cu.tipo === 'extrajudicial' ? 'pendiente' : 'parcial'"
                        />
                      </td>
                      <td class="px-4 sm:px-6 py-3">
                        <app-status-badge
                          [label]="data.estadoCuentaLabels[cu.estado]"
                          [variant]="cu.estado === 'activa' ? 'activa' : cu.estado === 'cerrada' ? 'cerrada' : 'en_proceso'"
                        />
                      </td>
                      <td class="px-4 sm:px-6 py-3 text-sm text-muted-foreground">
                        {{ data.etapaProcesoLabels[cu.etapa_proceso] }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (cuentas().length === 0) {
              <p class="text-center py-8 text-muted-foreground text-sm">No hay cuentas asociadas.</p>
            }
          </div>
        </section>

        <section>
          <h2 class="font-display font-semibold text-lg text-foreground mb-4">Detalle de transacciones</h2>
          <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
            <div class="table-wrap overflow-x-auto">
              <table class="w-full min-w-[720px]">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Propiedad</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Periodo</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Concepto</th>
                    <th class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Cobrado</th>
                    <th class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Pagado</th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of historialConPropiedad(); track h.id; let i = $index) {
                    <tr [@fadeInUpStagger]="stagger(i + 40)" class="border-b border-border/50">
                      <td class="px-4 sm:px-6 py-3 text-sm">{{ h.propiedad }}</td>
                      <td class="px-4 sm:px-6 py-3 font-mono text-sm">{{ h.periodo }}</td>
                      <td class="px-4 sm:px-6 py-3 text-sm">{{ data.conceptoLabels[h.concepto] }}</td>
                      <td class="px-4 sm:px-6 py-3 text-right text-sm">{{ data.formatCurrency(h.valor_cobrado) }}</td>
                      <td class="px-4 sm:px-6 py-3 text-right text-sm">{{ data.formatCurrency(h.valor_pagado) }}</td>
                      <td class="px-4 sm:px-6 py-3">
                        <app-status-badge
                          [label]="data.estadoPagoLabels[h.estado_pago]"
                          [variant]="h.estado_pago === 'pagado' ? 'pagado' : h.estado_pago === 'vencido' ? 'vencido' : 'pendiente'"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (historialConPropiedad().length === 0) {
              <p class="text-center py-8 text-muted-foreground text-sm">No hay movimientos registrados.</p>
            }
          </div>
        </section>
      } @else {
        <p class="text-muted-foreground">No se pudo cargar tu información. Cierra sesión y vuelve a entrar.</p>
      }
    </div>
  `,
})
export class ClientePortalPage {
  protected readonly auth = inject(AuthService);
  protected readonly data = inject(DataService);

  readonly fechaInforme = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly animParams = {
    value: '',
    params: { delay: 0, duration: 450, offset: 12, ease: 'ease-out' },
  };

  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) =>
            typeof value === 'number' ? this.data.formatCurrency(value) : value,
        },
      },
    },
    plugins: { legend: { position: 'top' } },
  };

  readonly barDeudaOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) =>
            typeof value === 'number' ? this.data.formatCurrency(value) : value,
        },
      },
    },
    plugins: { legend: { display: false } },
  };

  stagger(i: number) {
    return {
      value: '',
      params: { delay: 40 + i * 30, duration: 200, offset: 6, ease: 'ease-out' },
    };
  }

  private readonly clienteId = computed(() => this.auth.currentUser()?.clienteId ?? null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly cliente = computed(() => {
    const id = this.clienteId();
    if (!id) return null;
    return this.data.getClienteById(id) ?? null;
  });

  readonly propiedades = computed(() => {
    const id = this.clienteId();
    if (!id) return [];
    return this.data.getPropiedadesByCliente(id);
  });

  readonly cuentas = computed(() => {
    const id = this.clienteId();
    if (!id) return [];
    return this.data.getCuentasByCliente(id);
  });

  readonly totalCobrado = computed(() =>
    this.propiedades().reduce((sum, p) => sum + this.data.getTotalCobradoParaPropiedad(p), 0),
  );

  readonly totalPagado = computed(() =>
    this.propiedades().reduce((sum, p) => sum + this.data.getTotalPagadoParaPropiedad(p), 0),
  );

  readonly totalDeuda = computed(() =>
    this.propiedades().reduce((sum, p) => sum + this.data.getDeudaActualParaPropiedad(p), 0),
  );

  readonly historialConPropiedad = computed(() => {
    const props = this.propiedades();
    return props
      .flatMap((p) => {
        const hist = this.data.getHistorialByPropiedad(p.id);
        return hist.map((h) => ({ ...h, propiedad: p.identificador }));
      })
      .sort((a, b) => b.periodo.localeCompare(a.periodo) || b.created_at.localeCompare(a.created_at));
  });

  readonly hasHistorialChart = computed(() => this.historialConPropiedad().length > 0);

  readonly barCobradoPagadoData = computed((): ChartConfiguration<'bar'>['data'] => {
    const hist = this.historialConPropiedad();
    const periodos = [...new Set(hist.map((h) => h.periodo))].sort();
    return {
      labels: periodos,
      datasets: [
        {
          label: 'Cobrado',
          data: periodos.map((periodo) =>
            hist
              .filter((h) => h.periodo === periodo)
              .reduce((sum, h) => sum + this.toMoney(h.valor_cobrado), 0),
          ),
          backgroundColor: '#6b3cc8',
        },
        {
          label: 'Pagado',
          data: periodos.map((periodo) =>
            hist
              .filter((h) => h.periodo === periodo)
              .reduce((sum, h) => sum + this.toMoney(h.valor_pagado), 0),
          ),
          backgroundColor: '#22c55e',
        },
      ],
    };
  });

  readonly barDeudaPropiedadData = computed((): ChartConfiguration<'bar'>['data'] => {
    const props = this.propiedades();
    return {
      labels: props.map((p) => p.identificador),
      datasets: [
        {
          label: 'Deuda',
          data: props.map((p) => this.data.getDeudaActualParaPropiedad(p)),
          backgroundColor: '#6b3cc8',
        },
      ],
    };
  });

  constructor() {
    void this.init();
  }

  downloadPdf(): void {
    const c = this.cliente();
    if (!c) return;
    downloadClientGeneralReportPdf({
      data: this.data,
      cliente: c,
      propiedades: this.propiedades(),
      titulo: `Informe General – ${c.nombre}`,
      fecha: this.fechaInforme,
    });
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    const id = this.clienteId();
    if (!id) {
      this.error.set('No se encontró la sesión del cliente.');
      this.loading.set(false);
      return;
    }
    try {
      const [, propiedades] = await Promise.all([
        this.data.loadCliente(id),
        this.data.loadPropiedadesByCliente(id),
        this.data.loadCuentasByCliente(id),
      ]);
      const propiedadesDetalle = await this.data.loadPropiedadDetallesForPropiedades(propiedades);
      await this.data.loadHistorialesForPropiedades(propiedadesDetalle);
    } catch {
      this.error.set('No se pudo cargar la información del portal.');
    } finally {
      this.loading.set(false);
    }
  }

  protected resumenCobro(p: Propiedad) {
    return this.data.getResumenMoraCobroParaPropiedad(p);
  }

  private toMoney(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
