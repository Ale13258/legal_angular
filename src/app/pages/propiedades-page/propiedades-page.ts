import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Propiedad } from '../../core/models';
import { DataService } from '../../core/services/data.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { fadeInUp, fadeInUpStagger } from '../../core/animations/animations';

@Component({
  selector: 'app-propiedades-page',
  standalone: true,
  imports: [RouterLink, StatusBadge],
  animations: [fadeInUp, fadeInUpStagger],
  template: `
    <div class="min-h-screen">
      <div class="gradient-hero page-container pt-6 sm:pt-8 pb-10 sm:pb-12 rounded-b-[2rem]">
        <div class="w-full">
          <div
            [@fadeInUp]="{ value: '', params: { delay: 0, duration: 500, offset: 10, ease: 'ease-out' } }"
          >
            <h1 class="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              Propiedades
            </h1>
            <p class="text-primary-foreground/70 mb-6">Listado general de todas las propiedades</p>
          </div>
        </div>
      </div>

      <div class="page-container -mt-6 space-y-4">
        @if (error()) {
          <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {{ error() }}
          </div>
        }
        <div class="interactive-card rounded-2xl border border-border/50 bg-card shadow-card p-4 sm:p-5">
          <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div class="relative flex-1 min-w-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por identificador, dirección o cliente..."
                class="w-full min-w-0 rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
              />
            </div>
            <div class="relative shrink-0 sm:w-[200px]">
              <select
                [value]="filterTipo()"
                (change)="filterTipo.set($any($event.target).value)"
                class="w-full appearance-none rounded-xl border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todos">Todos los tipos</option>
                <option value="apartamento">APARTAMENTO</option>
                <option value="oficina">OFICINA</option>
                <option value="local">LOCAL</option>
                <option value="casa">CASA</option>
                <option value="bodega">BODEGA</option>
                <option value="garaje">GARAJE</option>
                <option value="parqueadero">PARQUEADERO</option>
                <option value="otro">OTRO</option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <div class="relative shrink-0 sm:w-[220px]">
              <select
                [value]="filterMora()"
                (change)="filterMora.set($any($event.target).value)"
                class="w-full appearance-none rounded-xl border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todas">Todas las edades de mora</option>
                <option value="sin_dato">Sin dato</option>
                <option value="al_dia">Al día (0 días)</option>
                <option value="1_30">1 a 30 días</option>
                <option value="31_60">31 a 60 días</option>
                <option value="61_90">61 a 90 días</option>
                <option value="91_mas">Más de 90 días</option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          @if (loading()) {
            <div class="px-6 py-8 text-sm text-muted-foreground">Cargando propiedades...</div>
          }
          <div class="table-wrap">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border bg-muted/20">
                  <th class="text-left px-5 sm:px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Identificador
                  </th>
                  <th class="text-left px-5 sm:px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Dirección
                  </th>
                  <th class="text-left px-5 sm:px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cliente
                  </th>
                  <th class="text-left px-5 sm:px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tipo
                  </th>
                  <th
                    class="text-right px-5 sm:px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide max-w-[12rem]"
                    title="Días, etapa y fechas (alta, inicio, fin) al pasar el cursor sobre la celda"
                  >
                    Edad en mora
                  </th>
                  <th class="text-right px-5 sm:px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Deuda a la fecha
                  </th>
                  <th class="text-right px-5 sm:px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (prop of filtered(); track prop.id; let i = $index) {
                  <tr
                    [@fadeInUpStagger]="{ value: '', params: { delay: i * 50, duration: 200, offset: 5, ease: 'ease-out' } }"
                    class="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    (click)="navigateToPropiedad(prop.id)"
                  >
                    <td class="px-5 sm:px-6 py-4 text-sm font-medium text-foreground">{{ prop.identificador }}</td>
                    <td class="px-5 sm:px-6 py-4 text-sm text-muted-foreground">{{ prop.direccion }}</td>
                    <td class="px-5 sm:px-6 py-4 text-sm text-muted-foreground">{{ prop.cliente?.nombre }}</td>
                    <td class="px-5 sm:px-6 py-4">
                      <app-status-badge
                        [label]="data.tipoPropiedadLabels[prop.tipo_propiedad] ?? prop.tipo_propiedad"
                        [variant]="prop.tipo_propiedad"
                      />
                    </td>
                    <td
                      class="px-5 sm:px-6 py-4 text-right text-sm align-top max-w-[13rem]"
                      [title]="data.formatResumenMoraTooltip(resumenCobro(prop))"
                    >
                      <div class="font-medium tabular-nums text-foreground">
                        {{ data.formatDiasMora(resumenCobro(prop).edad_mora_dias) }}
                      </div>
                      <div class="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                        {{ data.formatEtapaCobranzaCorta(resumenCobro(prop).edad_mora_dias) }}
                      </div>
                    </td>
                    <td class="px-5 sm:px-6 py-4 text-right text-sm font-semibold tabular-nums text-foreground">
                      {{ data.formatDeuda(data.getDeudaActualParaPropiedad(prop)) }}
                    </td>
                    <td class="px-5 sm:px-6 py-4 text-right">
                      <a
                        [routerLink]="['/propiedades', prop.id]"
                        (click)="$event.stopPropagation()"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                        title="Ver detalle"
                        aria-label="Ver detalle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filtered().length === 0) {
            <div class="text-center py-12 text-muted-foreground text-sm">No se encontraron propiedades</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PropiedadesPage {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  search = signal('');
  filterTipo = signal('todos');
  filterMora = signal('todas');

  propiedadesConCliente = computed(() =>
    this.data.mockPropiedades.map((p) => ({
      ...p,
      cliente: this.data.getClienteById(p.cliente_id),
    }))
  );

  filtered = computed(() => {
    const s = this.search().toLowerCase();
    const tip = this.filterTipo();
    const mora = this.filterMora();
    return this.propiedadesConCliente().filter((p) => {
      const matchSearch =
        !s ||
        p.identificador.toLowerCase().includes(s) ||
        p.direccion.toLowerCase().includes(s) ||
        p.cliente?.nombre.toLowerCase().includes(s);
      const matchTipo = tip === 'todos' || p.tipo_propiedad === tip;
      const diasMora = this.resumenCobro(p).edad_mora_dias;
      const n = Number.isFinite(Number(diasMora)) ? Math.max(0, Math.floor(Number(diasMora))) : null;
      const matchMora =
        mora === 'todas' ||
        (mora === 'sin_dato' && n === null) ||
        (mora === 'al_dia' && n === 0) ||
        (mora === '1_30' && n !== null && n >= 1 && n <= 30) ||
        (mora === '31_60' && n !== null && n >= 31 && n <= 60) ||
        (mora === '61_90' && n !== null && n >= 61 && n <= 90) ||
        (mora === '91_mas' && n !== null && n >= 91);
      return matchSearch && matchTipo && matchMora;
    });
  });

  constructor(
    protected data: DataService,
    private router: Router
  ) {
    void this.init();
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await Promise.all([this.data.loadClientes(), this.data.loadPropiedades()]);
    } catch {
      this.error.set('No se pudieron cargar las propiedades.');
    } finally {
      this.loading.set(false);
    }
  }

  navigateToPropiedad(id: string): void {
    this.router.navigate(['/propiedades', id]);
  }

  protected resumenCobro(p: Propiedad) {
    return this.data.getResumenMoraCobroParaPropiedad(p);
  }

  protected toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
