import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { DataService } from '../../core/services/data.service';
import { GraficosReportDialog } from '../../components/graficos-report-dialog/graficos-report-dialog';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { fadeInUp } from '../../core/animations/animations';
import type { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-graficos-page',
  standalone: true,
  imports: [RouterLink, BaseChartDirective, BalanceCard, GraficosReportDialog],
  animations: [fadeInUp],
  template: `
    <div class="min-h-screen pb-12">
      <div class="gradient-hero page-container pt-6 pb-10 rounded-b-[2rem]">
        <div class="w-full">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <a
              routerLink="/dashboard"
              class="nav-pill inline-flex items-center rounded-xl border border-primary-foreground/50 text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary-foreground/10"
            >
              Volver
            </a>
            <button
              type="button"
              (click)="reportOpen.set(true)"
              class="nav-pill inline-flex items-center gap-2 rounded-xl bg-primary-foreground text-primary px-3 py-1.5 text-sm font-medium hover:opacity-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
              Generar informe
            </button>
          </div>
          <h1 class="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
            Informes y Analítica
          </h1>
          <p class="text-primary-foreground/70 text-sm">Visión general de toda la cartera</p>
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
            Cargando métricas...
          </div>
        }
        <div
          [@fadeInUp]="{ value: '', params: { delay: 0, duration: 400, offset: 10, ease: 'ease-out' } }"
          class="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <app-balance-card
            label="CARTERA TOTAL"
            [amount]="totalCartera()"
            variant="highlight"
            icon="cartera"
            [accentLeft]="true"
          />
          <app-balance-card
            label="CLIENTES"
            [amount]="clientesCount()"
            [isCurrency]="false"
            icon="clientes"
            [accentLeft]="true"
          />
          <app-balance-card
            label="PROPIEDADES"
            [amount]="propiedadesCount()"
            [isCurrency]="false"
            icon="cuentas"
            [accentLeft]="true"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            [@fadeInUp]="{ value: '', params: { delay: 0, duration: 400, offset: 10, ease: 'ease-out' } }"
            class="interactive-card bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50 min-w-0"
          >
            <h3 class="font-display font-bold text-foreground mb-4">Distribución por Estado</h3>
            <div class="h-[250px]">
              <canvas baseChart [data]="pieEstadoData()" [options]="pieOptions" type="pie"></canvas>
            </div>
          </div>
          <div
            [@fadeInUp]="{ value: '', params: { delay: 100, duration: 400, offset: 10, ease: 'ease-out' } }"
            class="interactive-card bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50 min-w-0"
          >
            <h3 class="font-display font-bold text-foreground mb-4">Distribución por Tipo</h3>
            <div class="h-[250px]">
              <canvas baseChart [data]="pieTipoData()" [options]="pieOptions" type="pie"></canvas>
            </div>
          </div>
        </div>

        <div
          [@fadeInUp]="{ value: '', params: { delay: 150, duration: 400, offset: 10, ease: 'ease-out' } }"
          class="interactive-card bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50 min-w-0"
        >
          <h3 class="font-display font-bold text-foreground mb-4">Cobrado vs Pagado por Periodo</h3>
          <div class="h-[280px]">
            <canvas baseChart [data]="barCobradoPagadoData()" [options]="barOptions" type="bar"></canvas>
          </div>
        </div>
      </div>

      @if (reportOpen()) {
        <app-graficos-report-dialog
          [open]="reportOpen()"
          (openChange)="reportOpen.set($event)"
        />
      }
    </div>
  `,
})
export class GraficosPage {
  protected readonly data = inject(DataService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  reportOpen = signal(false);
  pieOptions: ChartConfiguration<'pie'>['options'] = { responsive: true, maintainAspectRatio: false };
  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
    },
  };

  totalCartera = computed(() => this.data.getTotalCartera());
  clientesCount = computed(() => this.data.mockClientes.length);
  propiedadesCount = computed(() => this.data.mockPropiedades.length);

  estadoCounts = computed(() => this.data.getDistribucionEstados());

  pieEstadoData = computed((): ChartConfiguration<'pie'>['data'] => {
    const counts = this.estadoCounts();
    const labels = Object.keys(counts).map(
      (k) => this.data.estadoCuentaLabels[k] ?? k
    );
    const values = Object.values(counts);
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ['#6b3cc8', '#22c55e', '#eab308', '#ef4444'],
        },
      ],
    };
  });

  pieTipoData = computed((): ChartConfiguration<'pie'>['data'] => {
    const counts = this.data.mockCuentas.reduce<Record<string, number>>((acc, c) => {
      acc[c.tipo] = (acc[c.tipo] ?? 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(counts).map(
      (k) => this.data.tipoCuentaLabels[k] ?? k
    );
    const values = Object.values(counts);
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ['#6b3cc8', '#22c55e', '#eab308'],
        },
      ],
    };
  });

  barCobradoPagadoData = computed((): ChartConfiguration<'bar'>['data'] => {
    const series = this.data.getEvolucionCartera();
    const labels = series.map((s) => s.periodo);
    const cobrado = series.map((s) => s.total);
    const pagado = series.map((s) => 0);
    return {
      labels,
      datasets: [
        { data: cobrado, label: 'Cobrado', backgroundColor: '#6b3cc8' },
        { data: pagado, label: 'Pagado', backgroundColor: '#22c55e' },
      ],
    };
  });

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.data.loadGraficosData(12);
    } catch {
      this.error.set('No se pudieron cargar las métricas.');
    } finally {
      this.loading.set(false);
    }
  }
}
