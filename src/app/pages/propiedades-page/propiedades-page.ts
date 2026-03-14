import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';

@Component({
  selector: 'app-propiedades-page',
  standalone: true,
  imports: [RouterLink, StatusBadge],
  template: `
    <div class="min-h-screen">
      <div class="gradient-hero px-8 pt-8 pb-12 rounded-b-[2rem]">
        <div class="max-w-6xl mx-auto">
          <h1 class="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
            Propiedades
          </h1>
          <p class="text-primary-foreground/70 mb-6">Listado general de todas las propiedades</p>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-8 -mt-6">
        <div class="bg-card rounded-2xl shadow-card p-6 mb-6 border border-border/50">
          <div class="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Buscar por identificador, dirección o cliente..."
              class="flex-1 pl-4 py-2 rounded-full border border-input bg-background"
              [value]="search()"
              (input)="search.set($any($event.target).value)"
            />
            <select
              [value]="filterTipo()"
              (change)="filterTipo.set($any($event.target).value)"
              class="w-[180px] rounded-full border border-input bg-background px-4 py-2"
            >
              <option value="todos">Todos los tipos</option>
              <option value="apartamento">Apartamento</option>
              <option value="local">Local</option>
              <option value="parqueadero">Parqueadero</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Identificador</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Dirección</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                  <th class="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                  <th class="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Monto</th>
                  <th class="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (prop of filtered(); track prop.id) {
                  <tr
                    class="border-b border-border/50 hover:bg-secondary/50 cursor-pointer"
                    (click)="navigateToPropiedad(prop.id)"
                  >
                    <td class="px-6 py-4 font-medium">{{ prop.identificador }}</td>
                    <td class="px-6 py-4 text-muted-foreground">{{ prop.direccion }}</td>
                    <td class="px-6 py-4 text-muted-foreground">{{ prop.cliente?.nombre }}</td>
                    <td class="px-6 py-4">
                      <app-status-badge [label]="data.tipoPropiedadLabels[prop.tipo_propiedad]" />
                    </td>
                    <td class="px-6 py-4 text-right font-semibold tabular-nums">
                      {{ data.formatCurrency(prop.monto_a_la_fecha) }}
                    </td>
                    <td class="px-6 py-4 text-right">
                      <a [routerLink]="['/propiedades', prop.id]" (click)="$event.stopPropagation()">Ver</a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filtered().length === 0) {
            <div class="text-center py-12 text-muted-foreground">No se encontraron propiedades</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PropiedadesPage {
  search = signal('');
  filterTipo = signal('todos');

  propiedadesConCliente = computed(() =>
    this.data.mockPropiedades.map((p) => ({
      ...p,
      cliente: this.data.getClienteById(p.cliente_id),
    }))
  );

  filtered = computed(() => {
    const s = this.search().toLowerCase();
    const tip = this.filterTipo();
    return this.propiedadesConCliente().filter((p) => {
      const matchSearch =
        !s ||
        p.identificador.toLowerCase().includes(s) ||
        p.direccion.toLowerCase().includes(s) ||
        p.cliente?.nombre.toLowerCase().includes(s);
      const matchTipo = tip === 'todos' || p.tipo_propiedad === tip;
      return matchSearch && matchTipo;
    });
  });

  constructor(
    protected data: DataService,
    private router: Router
  ) {}

  navigateToPropiedad(id: string): void {
    this.router.navigate(['/propiedades', id]);
  }
}
