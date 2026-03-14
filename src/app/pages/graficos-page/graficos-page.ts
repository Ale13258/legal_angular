import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { DataService } from '../../core/services/data.service';
import { GraficosReportDialog } from '../../components/graficos-report-dialog/graficos-report-dialog';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import type { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-graficos-page',
  standalone: true,
  imports: [RouterLink, BaseChartDirective, BalanceCard, GraficosReportDialog],
  template: `
    <div class="min-h-screen pb-12">
      <div class="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
        <div class="max-w-6xl mx-auto">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <a
              routerLink="/dashboard"
              class="inline-flex items-center rounded-xl border border-primary-foreground/50 text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary-foreground/10"
            >
              Volver
            </a>
            <button
              type="button"
              (click)="reportOpen.set(true)"
              class="inline-flex items-center gap-2 rounded-xl bg-primary-foreground text-primary px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
              Generar informe
            </button>
          </div>
          <h1 class="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
            Gráficos y Analítica
          </h1>
          <p class="text-primary-foreground/70 text-sm">Visión general de toda la cartera</p>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-8 -mt-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <app-balance-card label="Cartera Total" [amount]="totalCartera()" variant="highlight" />
          <app-balance-card label="Clientes" [amount]="clientesCount()" [isCurrency]="false" />
          <app-balance-card label="Propiedades" [amount]="propiedadesCount()" [isCurrency]="false" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h3 class="font-display font-bold text-foreground mb-4">Distribución por Estado</h3>
            <div class="h-[250px]">
              <canvas baseChart [data]="pieEstadoData()" [options]="pieOptions" type="pie"></canvas>
            </div>
          </div>
          <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h3 class="font-display font-bold text-foreground mb-4">Distribución por Tipo</h3>
            <div class="h-[250px]">
              <canvas baseChart [data]="pieTipoData()" [options]="pieOptions" type="pie"></canvas>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl shadow-card p-6 border border-border/50">
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

  estadoCounts = computed(() =>
    this.data.mockCuentas.reduce<Record<string, number>>((acc, c) => {
      acc[c.estado] = (acc[c.estado] ?? 0) + 1;
      return acc;
    }, {})
  );

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
    const counts = this.data.mockCuentas.reduce<Record<string, number>>(
      (acc, c) => {
        acc[c.tipo] = (acc[c.tipo] ?? 0) + 1;
        return acc;
      },
      {}
    );
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
    const periodos = [
      ...new Set(this.data.mockHistorial.map((h) => h.periodo)),
    ].sort();
    const labels = periodos;
    const cobrado = periodos.map((p) =>
      this.data.mockHistorial
        .filter((h) => h.periodo === p)
        .reduce((s, h) => s + h.valor_cobrado, 0)
    );
    const pagado = periodos.map((p) =>
      this.data.mockHistorial
        .filter((h) => h.periodo === p)
        .reduce((s, h) => s + h.valor_pagado, 0)
    );
    return {
      labels,
      datasets: [
        { data: cobrado, label: 'Cobrado', backgroundColor: '#6b3cc8' },
        { data: pagado, label: 'Pagado', backgroundColor: '#22c55e' },
      ],
    };
  });

  constructor(protected data: DataService) {}
}
