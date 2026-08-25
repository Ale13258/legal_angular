import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { BalanceCard } from '../../shared/balance-card/balance-card';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { fadeInUp, fadeInUpStagger } from '../../core/animations/animations';
import type { Cliente, Cuenta, ProcesoLegal, TipoProcesoLegal } from '../../core/models';
import {
  ESTADOS_PROCESO_LEGAL_UI,
  coerceEstadoProcesoLegal,
  matchesEstadoProcesoLegalFilter,
} from '../../core/proceso-estado';

type DashboardRow = {
  cliente: Cliente;
  procesos: ProcesoLegal[];
  propiedades: Cuenta[];
};

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
              Administra clientes, cobros y procesos jurídicos
            </p>
            <div class="flex flex-wrap gap-3">
              <a
                routerLink="/clientes/nuevo"
                class="nav-pill rounded-xl bg-primary-foreground text-primary px-4 py-2 font-medium hover:opacity-95"
              >
                + Nuevo Cliente
              </a>
              @if (auth.isSuperAdmin()) {
                <a
                  routerLink="/usuarios"
                  class="nav-pill rounded-xl bg-primary-foreground text-primary px-4 py-2 font-medium hover:opacity-95"
                >
                  Usuarios
                </a>
              }
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
            [amount]="procesosLegalesActivos()"
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
                placeholder="Buscar por cliente, radicado o propiedad..."
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
              @for (opt of estadoFiltroOpciones; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
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
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Propiedades</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">No. RADICADO</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th class="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filtered(); track row.cliente.id; let i = $index) {
                  <tr
                    [@fadeInUpStagger]="{ value: '', params: { delay: i * 50, duration: 200, offset: 5, ease: 'ease-out' } }"
                    class="border-b border-border/50 hover:bg-secondary/50"
                  >
                    <td class="px-6 py-4 font-medium">{{ row.cliente.nombre }}</td>
                    <td class="px-6 py-4 text-sm text-muted-foreground">
                      {{ resumenPropiedades(row) }}
                    </td>
                    <td class="px-6 py-4 text-muted-foreground font-mono text-sm">
                      {{ resumenRadicados(row) }}
                    </td>
                    <td class="px-6 py-4">
                      @if (tipoResumen(row); as tipo) {
                        <app-status-badge
                          [label]="tipo.label"
                          [variant]="tipo.variant"
                        />
                      } @else {
                        <span class="text-muted-foreground">-</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      @if (row.procesos.length > 0) {
                        <app-status-badge
                          [label]="data.formatEstadoProcesoLegal(estadoResumen(row))"
                          [variant]="data.variantEstadoProcesoLegal(estadoResumen(row))"
                        />
                      } @else {
                        <app-status-badge label="Sin radicado" variant="sin_cuenta" />
                      }
                    </td>
                    <td class="px-6 py-4 text-right">
                      <a
                        [routerLink]="['/clientes', row.cliente.id]"
                        class="inline-flex p-2 rounded-lg hover:bg-muted"
                        title="Ver cliente"
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
  protected readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  search = signal('');
  filterEstado = signal('todos');
  filterTipo = signal('todos');
  readonly estadoFiltroOpciones = ESTADOS_PROCESO_LEGAL_UI;

  private procesosByClienteId = computed(() => {
    const map = new Map<string, ProcesoLegal[]>();
    for (const proceso of this.data.mockProcesosLegales) {
      const list = map.get(proceso.cliente_id);
      if (list) list.push(proceso);
      else map.set(proceso.cliente_id, [proceso]);
    }
    return map;
  });

  private propiedadesByClienteId = computed(() => {
    const map = new Map<string, Cuenta[]>();
    for (const cuenta of this.data.mockCuentas) {
      const list = map.get(cuenta.cliente_id);
      if (list) list.push(cuenta);
      else map.set(cuenta.cliente_id, [cuenta]);
    }
    return map;
  });

  /** Un renglón por cliente: las propiedades y radicados viven en el detalle. */
  rows = computed(() => {
    const procesosMap = this.procesosByClienteId();
    const propiedadesMap = this.propiedadesByClienteId();
    return this.data.mockClientes.map((cliente) => ({
      cliente,
      procesos: procesosMap.get(cliente.id) ?? [],
      propiedades: propiedadesMap.get(cliente.id) ?? [],
    }));
  });

  filtered = computed(() => {
    const s = this.search().toLowerCase();
    const est = this.filterEstado();
    const tip = this.filterTipo() as TipoProcesoLegal | 'todos';
    return this.rows().filter((row) => {
      const matchSearch =
        !s ||
        row.cliente.nombre.toLowerCase().includes(s) ||
        row.procesos.some((p) => p.numero_cuenta.toLowerCase().includes(s)) ||
        row.propiedades.some(
          (p) =>
            p.identificador.toLowerCase().includes(s) || p.direccion.toLowerCase().includes(s),
        );
      const matchEstado =
        est === 'todos' ||
        (row.procesos.length > 0 &&
          row.procesos.some((p) => matchesEstadoProcesoLegalFilter(p.estado, est)));
      const matchTipo = tip === 'todos' || row.procesos.some((p) => p.tipo === tip);
      return matchSearch && matchEstado && matchTipo;
    });
  });

  totalCartera = computed(() => this.data.getTotalCartera());
  clientesActivos = computed(() => this.data.getClientesActivos());
  procesosLegalesActivos = computed(() => this.data.getProcesosLegalesActivos());

  resumenPropiedades(row: DashboardRow): string {
    const n = row.propiedades.length;
    if (n === 0) return '—';
    if (n === 1) return row.propiedades[0]!.identificador;
    return `${n} propiedades`;
  }

  resumenRadicados(row: DashboardRow): string {
    const n = row.procesos.length;
    if (n === 0) return '—';
    if (n === 1) return row.procesos[0]!.numero_cuenta;
    return `${n} radicados`;
  }

  tipoResumen(row: DashboardRow): { label: string; variant: string } | null {
    if (row.procesos.length === 0) return null;
    const first = row.procesos[0]!.tipo;
    const mismoTipo = row.procesos.every((p) => p.tipo === first);
    if (!mismoTipo) return { label: 'VARIOS', variant: 'default' };
    return {
      label: this.data.tipoProcesoLegalLabels[first] ?? first,
      variant:
        first === 'juridica' ? 'juridica' : first === 'extrajudicial' ? 'pendiente' : 'parcial',
    };
  }

  estadoResumen(row: DashboardRow): string {
    if (row.procesos.some((p) => coerceEstadoProcesoLegal(p.estado) === 'en_proceso')) {
      return 'en_proceso';
    }
    return 'cerrada';
  }

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
