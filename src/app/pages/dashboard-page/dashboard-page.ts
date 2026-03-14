import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, BalanceCard, StatusBadge],
  template: `
    <div class="min-h-screen">
      <div class="gradient-hero px-8 pt-8 pb-12 rounded-b-[2rem]">
        <div class="max-w-6xl mx-auto">
          <h1 class="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
            Gestión de Cartera
          </h1>
          <p class="text-primary-foreground/70 mb-6">
            Administra cuentas, cobros y procesos jurídicos
          </p>
          <div class="flex flex-wrap gap-3">
            <a
              routerLink="/clientes/nuevo"
              class="rounded-xl bg-primary-foreground text-primary px-4 py-2 font-medium hover:opacity-90"
            >
              + Nuevo Cliente
            </a>
            <a
              routerLink="/graficos"
              class="rounded-xl border-2 border-primary-foreground/50 text-primary-foreground px-4 py-2 font-medium hover:bg-primary-foreground/10"
            >
              Ver gráficos generales
            </a>
          </div>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-8 -mt-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <app-balance-card
            label="$ CARTERA TOTAL"
            [amount]="totalCartera()"
            variant="highlight"
          />
          <app-balance-card
            label="CLIENTES ACTIVOS"
            [amount]="clientesActivos()"
            [isCurrency]="false"
          />
          <app-balance-card
            label="CUENTAS ACTIVAS"
            [amount]="cuentasActivas()"
            [isCurrency]="false"
          />
        </div>

        <div class="bg-card rounded-2xl shadow-card p-6 mb-6 border border-border/50">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por cliente o número de cuenta..."
                [value]="search()"
                (input)="search.set($any($event.target).value)"
                class="w-full pl-10 pr-4 py-2 rounded-full border border-input bg-background"
              />
            </div>
            <select
              [value]="filterEstado()"
              (change)="filterEstado.set($any($event.target).value)"
              class="w-[160px] rounded-full border border-input bg-background px-4 py-2"
            >
              <option value="todos">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="cerrada">Cerrada</option>
              <option value="en_proceso">En Proceso</option>
            </select>
            <select
              [value]="filterTipo()"
              (change)="filterTipo.set($any($event.target).value)"
              class="w-[160px] rounded-full border border-input bg-background px-4 py-2"
            >
              <option value="todos">Todos los tipos</option>
              <option value="juridica">Jurídica</option>
              <option value="extrajudicial">Extrajudicial</option>
              <option value="acuerdo_de_pago">Acuerdo de Pago</option>
            </select>
          </div>
        </div>

        <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Cuenta</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th class="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (cu of filtered(); track cu.id) {
                  <tr class="border-b border-border/50 hover:bg-secondary/50">
                    <td class="px-6 py-4 font-medium">{{ cu.cliente?.nombre }}</td>
                    <td class="px-6 py-4 text-muted-foreground font-mono text-sm">{{ cu.numero_cuenta }}</td>
                    <td class="px-6 py-4">
                      <app-status-badge
                        [label]="data.tipoCuentaLabels[cu.tipo]"
                        [variant]="cu.tipo === 'juridica' ? 'juridica' : cu.tipo === 'extrajudicial' ? 'pendiente' : 'parcial'"
                      />
                    </td>
                    <td class="px-6 py-4">
                      <app-status-badge
                        [label]="data.estadoCuentaLabels[cu.estado]"
                        [variant]="cu.estado === 'activa' ? 'activa' : cu.estado === 'cerrada' ? 'cerrada' : 'en_proceso'"
                      />
                    </td>
                    <td class="px-6 py-4 text-right">
                      <a
                        [routerLink]="['/clientes', cu.cliente_id]"
                        class="inline-flex p-2 rounded-lg hover:bg-muted"
                        title="Ver"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filtered().length === 0) {
            <div class="text-center py-12 text-muted-foreground">No se encontraron resultados</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardPage {
  search = signal('');
  filterEstado = signal('todos');
  filterTipo = signal('todos');

  cuentasConCliente = computed(() =>
    this.data.mockCuentas.map((cu) => ({
      ...cu,
      cliente: this.data.getClienteById(cu.cliente_id),
    }))
  );

  filtered = computed(() => {
    const s = this.search().toLowerCase();
    const est = this.filterEstado();
    const tip = this.filterTipo();
    return this.cuentasConCliente().filter((cu) => {
      const matchSearch =
        !s ||
        cu.cliente?.nombre.toLowerCase().includes(s) ||
        cu.numero_cuenta.toLowerCase().includes(s);
      const matchEstado = est === 'todos' || cu.estado === est;
      const matchTipo = tip === 'todos' || cu.tipo === tip;
      return matchSearch && matchEstado && matchTipo;
    });
  });

  totalCartera = computed(() => this.data.getTotalCartera());
  clientesActivos = computed(() => this.data.mockClientes.length);
  cuentasActivas = computed(
    () => this.data.mockCuentas.filter((c) => c.estado === 'activa').length
  );

  constructor(protected data: DataService) {}
}
