import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { fadeInUp, fadeInUpStagger } from '../../core/animations/animations';
import type { Cliente, Cuenta } from '../../core/models';

type DashboardRow = { cliente: Cliente; cuenta: Cuenta | null };

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, BalanceCard, StatusBadge],
  animations: [fadeInUp, fadeInUpStagger],
  template: `
    <div class="min-h-screen">
      <div class="gradient-hero page-container pt-6 sm:pt-8 pb-10 sm:pb-12 rounded-b-[2rem]">
        <div class="w-full">
          <div
            [@fadeInUp]="{ value: '', params: { delay: 0, duration: 500, offset: 10, ease: 'ease-out' } }"
          >
            <h1 class="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              Gestión de Cartera
            </h1>
            <p class="text-primary-foreground/70 mb-6">
              Administra cuentas, cobros y procesos jurídicos
            </p>
            <div class="flex flex-wrap gap-3">
              <a
                routerLink="/clientes/nuevo"
                class="nav-pill rounded-xl bg-primary-foreground text-primary px-4 py-2 font-medium hover:opacity-95"
              >
                + Nuevo Cliente
              </a>
              <a
                routerLink="/graficos"
                class="nav-pill rounded-xl border-2 border-primary-foreground/50 text-primary-foreground px-4 py-2 font-medium hover:bg-primary-foreground/10"
              >
                Ver informes
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="page-container -mt-6">
        @if (error()) {
          <div class="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {{ error() }}
          </div>
        }
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <app-balance-card
            label="CARTERA TOTAL"
            [amount]="totalCartera()"
            variant="highlight"
            icon="cartera"
            [accentLeft]="true"
          />
          <app-balance-card
            label="CLIENTES ACTIVOS"
            [amount]="clientesActivos()"
            [isCurrency]="false"
            icon="clientes"
            [accentLeft]="true"
          />
          <app-balance-card
            label="CUENTAS ACTIVAS"
            [amount]="cuentasActivas()"
            [isCurrency]="false"
            icon="cuentas"
            [accentLeft]="true"
          />
        </div>

        <div class="interactive-card bg-card rounded-2xl shadow-card p-4 sm:p-6 mb-6 border border-border/50">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="relative flex-1 min-w-0">
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
              class="w-full sm:w-[160px] rounded-full border border-input bg-background px-4 py-2"
            >
              <option value="todos">Todos los estados</option>
              <option value="activa">ACTIVA</option>
              <option value="cerrada">FINALIZADO</option>
              <option value="en_proceso">EN PROCESO</option>
            </select>
            <select
              [value]="filterTipo()"
              (change)="filterTipo.set($any($event.target).value)"
              class="w-full sm:w-[160px] rounded-full border border-input bg-background px-4 py-2"
            >
              <option value="todos">Todos los tipos</option>
              <option value="juridica">JURÍDICO</option>
              <option value="extrajudicial">PRE-JURÍDICO</option>
              <option value="acuerdo_de_pago">ACUERDO DE PAGO</option>
            </select>
          </div>
        </div>

        <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          @if (loading()) {
            <div class="px-6 py-8 text-sm text-muted-foreground">Cargando datos...</div>
          }
          <div class="table-wrap">
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
                @for (row of filtered(); track (row.cuenta?.id ?? row.cliente.id); let i = $index) {
                  <tr
                    [@fadeInUpStagger]="{ value: '', params: { delay: i * 50, duration: 200, offset: 5, ease: 'ease-out' } }"
                    class="border-b border-border/50 hover:bg-secondary/50"
                  >
                    <td class="px-6 py-4 font-medium">{{ row.cliente.nombre }}</td>
                    <td class="px-6 py-4 text-muted-foreground font-mono text-sm">
                      @if (row.cuenta) {
                        {{ row.cuenta.numero_cuenta }}
                      } @else {
                        -
                      }
                    </td>
                    <td class="px-6 py-4">
                      @if (row.cuenta) {
                        <app-status-badge
                          [label]="data.tipoCuentaLabels[row.cuenta.tipo]"
                          [variant]="
                            row.cuenta.tipo === 'juridica'
                              ? 'juridica'
                              : row.cuenta.tipo === 'extrajudicial'
                                ? 'pendiente'
                                : 'parcial'
                          "
                        />
                      } @else {
                        <span class="text-muted-foreground">-</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      @if (row.cuenta) {
                        @if (row.cuenta.estado) {
                          <app-status-badge
                            [label]="data.estadoCuentaLabels[row.cuenta.estado]"
                            [variant]="
                              row.cuenta.estado === 'activa'
                                ? 'activa'
                                : row.cuenta.estado === 'cerrada'
                                  ? 'cerrada'
                                  : 'en_proceso'
                            "
                          />
                        } @else {
                          <app-status-badge label="Estado no informado" variant="default" />
                        }
                      } @else {
                        <app-status-badge label="Sin cuenta" variant="sin_cuenta" />
                      }
                    </td>
                    <td class="px-6 py-4 text-right">
                      <a
                        [routerLink]="['/clientes', row.cliente.id]"
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
  protected readonly data = inject(DataService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  search = signal('');
  filterEstado = signal('todos');
  filterTipo = signal('todos');

  private cuentasByClienteId = computed(() => {
    const map = new Map<string, Cuenta[]>();
    for (const cu of this.data.mockCuentas) {
      const list = map.get(cu.cliente_id);
      if (list) list.push(cu);
      else map.set(cu.cliente_id, [cu]);
    }
    return map;
  });

  /**
   * "Left join": mostrar SIEMPRE el cliente en el dashboard,
   * y la cuenta solo si existe.
   */
  rows = computed(() => {
    const rows: Array<DashboardRow> = [];
    const clientes = this.data.mockClientes;
    const cuentasMap = this.cuentasByClienteId();

    for (const cliente of clientes) {
      const cuentas = cuentasMap.get(cliente.id);
      if (cuentas && cuentas.length > 0) {
        for (const cuenta of cuentas) rows.push({ cliente, cuenta });
      } else {
        rows.push({ cliente, cuenta: null });
      }
    }

    return rows;
  });

  filtered = computed(() => {
    const s = this.search().toLowerCase();
    const est = this.filterEstado();
    const tip = this.filterTipo();
    return this.rows().filter((row) => {
      const clienteNombre = row.cliente.nombre?.toLowerCase() ?? '';
      const cuentaNumero = row.cuenta?.numero_cuenta?.toLowerCase() ?? '';

      const matchSearch = !s || clienteNombre.includes(s) || cuentaNumero.includes(s);
      const matchEstado = est === 'todos' || row.cuenta?.estado === est;
      const matchTipo = tip === 'todos' || row.cuenta?.tipo === tip;

      // Si hay filtros de cuenta (estado/tipo) y la fila no tiene cuenta,
      // entonces no puede coincidir (salvo que ambos filtros sean 'todos').
      return matchSearch && matchEstado && matchTipo;
    });
  });

  totalCartera = computed(() => this.data.getTotalCartera());
  clientesActivos = computed(() => this.data.getClientesActivos());
  cuentasActivas = computed(() => this.data.getCuentasActivas());

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.data.loadDashboardData();
    } catch {
      this.error.set('No se pudo cargar el dashboard.');
    } finally {
      this.loading.set(false);
    }
  }
}
