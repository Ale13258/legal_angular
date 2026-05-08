import { Component, computed, inject, signal } from '@angular/core';
import type { Propiedad } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { fadeInUp, fadeInUpStagger } from '../../core/animations/animations';

@Component({
  selector: 'app-cliente-portal-page',
  standalone: true,
  imports: [StatusBadge],
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
        <div [@fadeInUp]="animParams">
          <h1 class="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            Mi información
          </h1>
          <p class="text-muted-foreground mb-2">{{ c.nombre }}</p>
          <p class="text-sm text-muted-foreground mb-8">
            {{ c.documento }} · {{ c.email }} · {{ c.telefono }}
          </p>
        </div>

        <section class="mb-10">
          <h2 class="font-display font-semibold text-lg text-foreground mb-4">Propiedades</h2>
          <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
            <div class="table-wrap overflow-x-auto">
              <table class="w-full min-w-[720px]">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Tipo
                    </th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Identificador
                    </th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Dirección
                    </th>
                    <th
                      class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase max-w-[13rem]"
                      title="Días, etapa y fechas (alta, inicio, fin) al pasar el cursor"
                    >
                      Edad en mora
                    </th>
                    <th class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Saldo a la fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of propiedades(); track p.id; let i = $index) {
                    <tr
                      [@fadeInUpStagger]="stagger(i)"
                      class="border-b border-border/50"
                    >
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
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Nº cuenta
                    </th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Tipo
                    </th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Estado
                    </th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Etapa
                    </th>
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
          <h2 class="font-display font-semibold text-lg text-foreground mb-4">Historial de pagos</h2>
          <p class="text-xs text-muted-foreground mb-3">
            Mora e inicio/fin de cobro por unidad aparecen arriba, en la tabla de propiedades.
          </p>
          <div class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
            <div class="table-wrap overflow-x-auto">
              <table class="w-full min-w-[640px]">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Periodo
                    </th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Concepto
                    </th>
                    <th class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Cobrado
                    </th>
                    <th class="text-right px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Pagado
                    </th>
                    <th class="text-left px-4 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of historialOrdenado(); track h.id; let i = $index) {
                    <tr [@fadeInUpStagger]="stagger(i + 40)" class="border-b border-border/50">
                      <td class="px-4 sm:px-6 py-3 font-mono text-sm">{{ h.periodo }}</td>
                      <td class="px-4 sm:px-6 py-3 text-sm">
                        {{ data.conceptoLabels[h.concepto] }}
                      </td>
                      <td class="px-4 sm:px-6 py-3 text-right text-sm">
                        {{ data.formatCurrency(h.valor_cobrado) }}
                      </td>
                      <td class="px-4 sm:px-6 py-3 text-right text-sm">
                        {{ data.formatCurrency(h.valor_pagado) }}
                      </td>
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
            @if (historialOrdenado().length === 0) {
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

  readonly animParams = {
    value: '',
    params: { delay: 0, duration: 450, offset: 12, ease: 'ease-out' },
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

  readonly historialOrdenado = computed(() => {
    const id = this.clienteId();
    if (!id) return [];
    return this.data
      .getHistorialByClienteId(id)
      .slice()
      .sort((a, b) => b.periodo.localeCompare(a.periodo) || b.created_at.localeCompare(a.created_at));
  });

  constructor() {
    void this.init();
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
      await Promise.all([
        this.data.loadCliente(id),
        this.data.loadPropiedadesByCliente(id),
        this.data.loadCuentasByCliente(id),
      ]);
      const propiedades = this.data.getPropiedadesByCliente(id);
      await Promise.all(propiedades.map((p) => this.data.loadHistorialByPropiedad(p.id)));
    } catch {
      this.error.set('No se pudo cargar la información del portal.');
    } finally {
      this.loading.set(false);
    }
  }

  protected resumenCobro(p: Propiedad) {
    return this.data.getResumenMoraCobroParaPropiedad(p);
  }
}
