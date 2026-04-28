import { Component, input, output, signal } from '@angular/core';
import type { Propiedad } from '../../core/models';

@Component({
  selector: 'app-registrar-gestion-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-md">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 class="font-display text-lg font-bold text-foreground">Registrar Gestión de Cobro</h2>
          <button
            type="button"
            (click)="openChange.emit(false)"
            class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- (submit) + preventDefault: sin FormsModule, (ngSubmit) no aplica y el submit nativo recarga la SPA -->
        <form (submit)="onFormSubmit($event)" class="p-6 space-y-5">
          <!-- Fecha -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Fecha</label>
            <div class="relative">
              <input
                type="date"
                [value]="fecha()"
                (input)="fecha.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </span>
            </div>
          </div>

          <!-- Estado -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Estado</label>
            <select
              [value]="estado()"
              (change)="estado.set($any($event.target).value)"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              @for (opt of estadoOpciones; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>

          <!-- Descripción de la gestión -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Descripción de la gestión</label>
            <textarea
              [value]="descripcion()"
              (input)="descripcion.set($any($event.target).value)"
              placeholder="Ej: Se realizó llamada telefónica al cliente..."
              rows="4"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            ></textarea>
          </div>

          <!-- Botones -->
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
              Guardar Gestión
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RegistrarGestionDialog {
  open = input<boolean>(true);
  propiedad = input.required<Propiedad>();
  openChange = output<boolean>();
  saved = output<{ fecha: string; estado: string; descripcion: string }>();

  fecha = signal(this.fechaHoy());
  estado = signal('pendiente');
  descripcion = signal('');

  estadoOpciones = [
    { value: 'recibido', label: 'RECIBIDO' },
    { value: 'enviado', label: 'ENVIADO' },
    { value: 'pendiente', label: 'PENDIENTE' },
  ];

  private fechaHoy(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    this.guardar();
  }

  guardar(): void {
    const f = this.fecha();
    const e = this.estado();
    const d = this.descripcion().trim();
    console.log('[LegalDebug][RegistrarGestionDialog] guardar() emit saved', {
      propiedadId: this.propiedad().id,
      fecha: f,
      estado: e,
      descripcion: d,
    });
    this.saved.emit({ fecha: f, estado: e, descripcion: d });
    this.descripcion.set('');
    this.estado.set('pendiente');
    this.fecha.set(this.fechaHoy());
    this.openChange.emit(false);
  }
}
