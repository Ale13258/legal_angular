import { Component, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { Propiedad } from '../../core/models';
import type { ConceptoPago, EstadoPago } from '../../core/models';

@Component({
  selector: 'app-agregar-registro-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 class="font-display text-lg font-bold text-foreground">Agregar registro al historial de pagos</h2>
          <button
            type="button"
            (click)="openChange.emit(false)"
            class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- (submit) + preventDefault: sin FormsModule, (ngSubmit) no aplica NgForm y el navegador recarga la página -->
        <form (submit)="onFormSubmit($event)" class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Período (YYYY-MM)</label>
              <input
                type="month"
                [value]="periodo()"
                (input)="periodo.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Concepto</label>
              <select
                [value]="concepto()"
                (change)="concepto.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                @for (opt of conceptoOpciones; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Valor cobrado (COP)</label>
              <input
                type="number"
                min="0"
                step="1"
                [value]="0"
                readonly
                class="w-full rounded-xl border border-input bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
              <p class="mt-1 text-xs text-muted-foreground">Este valor es fijo y no se edita desde el historial.</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Valor pagado (COP)</label>
              <input
                type="number"
                min="0"
                step="1"
                [value]="valorPagado()"
                (input)="valorPagado.set(+$any($event.target).value || 0)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Fecha de pago</label>
              <input
                type="date"
                [value]="fechaPago()"
                (input)="fechaPago.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Estado de pago</label>
              <select
                [value]="estadoPago()"
                (change)="estadoPago.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                @for (opt of estadoOpciones; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
          </div>

          <p class="text-xs text-muted-foreground">
            Inicio y fin del cobro los calcula el sistema (alta de la propiedad y saldo); no se capturan aquí.
          </p>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Observaciones</label>
            <textarea
              [value]="observaciones()"
              (input)="observaciones.set($any($event.target).value)"
              placeholder="Opcional"
              rows="2"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            ></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              (click)="openChange.emit(false)"
              class="flex-1 rounded-xl border-2 border-primary text-primary px-4 py-2.5 text-sm font-medium hover:bg-primary/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Agregar registro
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AgregarRegistroDialog {
  open = input<boolean>(true);
  propiedad = input.required<Propiedad>();
  openChange = output<boolean>();
  saved = output<void>();

  periodo = signal(this.periodoActual());
  concepto = signal<ConceptoPago>('administracion');
  valorPagado = signal(0);
  fechaPago = signal('');
  estadoPago = signal<EstadoPago>('pendiente');
  observaciones = signal('');

  conceptoOpciones = [
    { value: 'administracion', label: 'Administración' },
    { value: 'intereses', label: 'Intereses' },
    { value: 'extraordinaria', label: 'Extraordinaria' },
    { value: 'otros', label: 'Otros' },
  ];
  estadoOpciones = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'parcial', label: 'Parcial' },
    { value: 'pagado', label: 'Pagado' },
    { value: 'vencido', label: 'Vencido' },
  ];

  constructor(private data: DataService) {}

  private periodoActual(): string {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    void this.guardar();
  }

  async guardar(): Promise<void> {
    const propiedadId = this.propiedad().id;
    const payload = {
      periodo: this.periodo(),
      concepto: this.concepto(),
      valor_cobrado: 0,
      valor_pagado: this.valorPagado(),
      fecha_pago: this.fechaPago(),
      estado_pago: this.estadoPago(),
      observaciones: this.observaciones().trim(),
    };
    console.log('[LegalDebug][AgregarRegistroDialog] guardar() inicio', { propiedadId, payload });
    try {
      await this.data.addHistorialPago(propiedadId, payload);
      console.log('[LegalDebug][AgregarRegistroDialog] guardar() éxito');
      this.saved.emit();
      this.reset();
      this.openChange.emit(false);
    } catch (err) {
      console.error('[LegalDebug][AgregarRegistroDialog] guardar() error (modal no se cierra)', err);
    }
  }

  private reset(): void {
    this.periodo.set(this.periodoActual());
    this.concepto.set('administracion');
    this.valorPagado.set(0);
    this.fechaPago.set('');
    this.estadoPago.set('pendiente');
    this.observaciones.set('');
  }
}
