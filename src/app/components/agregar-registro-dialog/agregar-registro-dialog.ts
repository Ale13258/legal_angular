import { Component, effect, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { HistorialPago, Cuenta } from '../../core/models';
import type { ConceptoPago, EstadoPago } from '../../core/models';

type FechaFieldKey = 'periodo' | 'fecha_pago';

@Component({
  selector: 'app-agregar-registro-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div
        class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 class="font-display text-lg font-bold text-foreground">
            {{ historial() ? 'Editar registro del historial' : 'Agregar registro al historial de pagos' }}
          </h2>
          <button
            type="button"
            (click)="openChange.emit(false)"
            class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form (submit)="onFormSubmit($event)" class="p-6 space-y-4">
          @if (saveError()) {
            <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ saveError() }}
            </div>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Período (YYYY-MM)</label>
              <input
                type="month"
                [value]="periodo()"
                (input)="onPeriodoInput($event)"
                [class.border-destructive]="invalidField() === 'periodo'"
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
                [value]="valorCobrado()"
                (input)="onValorCobradoInput($event)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
                (input)="onFechaPagoInput($event)"
                [class.border-destructive]="invalidField() === 'fecha_pago'"
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
              [disabled]="saving()"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {{ historial() ? 'Guardar cambios' : 'Agregar registro' }}
            </button>
          </div>
        </form>
      </div>

      @if (fechaValidationModal()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/60" (click)="cerrarValidacionFecha()"></div>
          <div
            class="relative z-[61] w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-4 flex items-start gap-3">
              <div class="rounded-xl bg-destructive/10 p-2 text-destructive shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              </div>
              <div>
                <h3 class="font-display text-lg font-bold text-foreground">Corrija la fecha</h3>
                <p class="mt-2 text-sm text-muted-foreground">{{ fechaValidationMessage() }}</p>
                <p class="mt-2 text-xs font-medium text-destructive">
                  Campo a revisar: {{ invalidFieldLabel() }}
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="cerrarValidacionFecha()"
              class="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
            >
              Entendido, corregir
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class AgregarRegistroDialog {
  open = input<boolean>(true);
  cuenta = input.required<Cuenta>();
  historial = input<HistorialPago | null>(null);
  registroFormNonce = input(0);
  openChange = output<boolean>();
  saved = output<void>();

  periodo = signal(this.periodoActual());
  concepto = signal<ConceptoPago>('administracion');
  valorCobrado = signal(0);
  valorPagado = signal(0);
  fechaPago = signal('');
  estadoPago = signal<EstadoPago>('pendiente');
  observaciones = signal('');
  saving = signal(false);
  saveError = signal<string | null>(null);
  fechaValidationModal = signal(false);
  fechaValidationMessage = signal('');
  invalidField = signal<FechaFieldKey | null>(null);

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

  private lastSyncedFormKey: string | null = null;

  constructor(private data: DataService) {
    effect(() => {
      const nonce = this.registroFormNonce();
      const current = this.historial();
      const key = `${nonce}:${current?.id ?? '__nuevo__'}`;
      if (this.lastSyncedFormKey === key) return;
      this.lastSyncedFormKey = key;
      this.saveError.set(null);
      this.fechaValidationModal.set(false);
      this.invalidField.set(null);
      if (current) {
        this.applyHistorialToForm(current);
      } else {
        this.resetEmpty();
      }
    });
  }

  private applyHistorialToForm(h: HistorialPago): void {
    this.periodo.set(h.periodo?.trim() || this.periodoActual());
    this.concepto.set(this.coerceConcepto(h.concepto));
    this.valorCobrado.set(Math.max(0, Number(h.valor_cobrado) || 0));
    this.valorPagado.set(Math.max(0, Number(h.valor_pagado) || 0));
    this.fechaPago.set(h.fecha_pago?.trim().slice(0, 10) ?? '');
    this.estadoPago.set(this.coerceEstado(h.estado_pago));
    this.observaciones.set(h.observaciones ?? '');
  }

  private coerceConcepto(v: unknown): ConceptoPago {
    const s = String(v ?? '').trim() as ConceptoPago;
    return this.conceptoOpciones.some((o) => o.value === s) ? s : 'administracion';
  }

  private coerceEstado(v: unknown): EstadoPago {
    const s = String(v ?? '').trim() as EstadoPago;
    return this.estadoOpciones.some((o) => o.value === s) ? s : 'pendiente';
  }

  private periodoActual(): string {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  invalidFieldLabel(): string {
    return this.invalidField() === 'periodo' ? 'Período (YYYY-MM)' : 'Fecha de pago';
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    void this.guardar();
  }

  onPeriodoInput(event: Event): void {
    this.invalidField.set(null);
    const value = (event.target as HTMLInputElement).value;
    this.periodo.set(value);
  }

  onFechaPagoInput(event: Event): void {
    this.invalidField.set(null);
    const value = (event.target as HTMLInputElement).value;
    this.fechaPago.set(value);
  }

  cerrarValidacionFecha(): void {
    this.fechaValidationModal.set(false);
  }

  private mostrarErrorFecha(field: FechaFieldKey, message: string): void {
    this.invalidField.set(field);
    this.fechaValidationMessage.set(message);
    this.fechaValidationModal.set(true);
  }

  private validarFechas(): boolean {
    const periodo = this.periodo().trim();
    if (!periodo) {
      this.mostrarErrorFecha('periodo', 'Seleccione el período del registro (año y mes).');
      return false;
    }
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      this.mostrarErrorFecha('periodo', 'El período debe tener el formato AAAA-MM (ejemplo: 2026-06).');
      return false;
    }
    const mes = Number(periodo.slice(5, 7));
    if (mes < 1 || mes > 12) {
      this.mostrarErrorFecha('periodo', 'El mes del período no es válido. Use un valor entre 01 y 12.');
      return false;
    }

    const fecha = this.fechaPago().trim();
    const estado = this.estadoPago();
    const pagado = this.valorPagado();

    if ((estado === 'pagado' || estado === 'parcial') && pagado > 0 && !fecha) {
      this.mostrarErrorFecha(
        'fecha_pago',
        'Debe indicar la fecha de pago cuando el estado es Parcial o Pagado y hay valor pagado.',
      );
      return false;
    }

    if (fecha) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        this.mostrarErrorFecha('fecha_pago', 'La fecha de pago debe tener el formato AAAA-MM-DD.');
        return false;
      }
      const fechaDate = new Date(`${fecha}T12:00:00`);
      if (Number.isNaN(fechaDate.getTime())) {
        this.mostrarErrorFecha('fecha_pago', 'La fecha de pago no es una fecha válida del calendario.');
        return false;
      }
      if (!fecha.startsWith(periodo)) {
        this.mostrarErrorFecha(
          'fecha_pago',
          `La fecha de pago debe pertenecer al mismo mes del período (${periodo}).`,
        );
        return false;
      }
    }

    this.invalidField.set(null);
    return true;
  }

  private parseFechaErrorFromApi(err: unknown): { field: FechaFieldKey; message: string } | null {
    const body = (err as { error?: { message?: string; details?: unknown } })?.error;
    const raw = typeof body?.message === 'string' ? body.message : '';
    const text = raw.toLowerCase();
    if (text.includes('periodo')) {
      return { field: 'periodo', message: raw || 'Corrija el campo Período (YYYY-MM).' };
    }
    if (text.includes('fecha_pago') || text.includes('fecha de pago')) {
      return { field: 'fecha_pago', message: raw || 'Corrija el campo Fecha de pago.' };
    }
    if (text.includes('fecha_fin_cobro') || text.includes('fecha_inicio_cobro')) {
      return { field: 'fecha_pago', message: raw || 'Revise las fechas del registro.' };
    }
    return null;
  }

  onValorCobradoInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const raw = +(target?.value ?? 0);
    this.valorCobrado.set(raw < 0 ? 0 : raw);
  }

  async guardar(): Promise<void> {
    if (!this.validarFechas()) return;

    const cuentaId = this.cuenta().id;
    const fechaRaw = this.fechaPago().trim();
    const payload = {
      periodo: this.periodo().trim(),
      concepto: this.concepto(),
      valor_cobrado: this.valorCobrado(),
      valor_pagado: this.valorPagado(),
      fecha_pago: fechaRaw,
      estado_pago: this.estadoPago(),
      observaciones: this.observaciones().trim(),
    };

    this.saveError.set(null);
    this.saving.set(true);
    const editing = this.historial();
    try {
      if (editing) {
        await this.data.updateHistorialPago(cuentaId, editing.id, payload);
      } else {
        await this.data.addHistorialPago(cuentaId, payload);
      }
      this.saved.emit();
      this.openChange.emit(false);
    } catch (err) {
      const fechaErr = this.parseFechaErrorFromApi(err);
      if (fechaErr) {
        this.mostrarErrorFecha(fechaErr.field, fechaErr.message);
      } else {
        this.saveError.set(
          editing
            ? 'No se pudo editar el registro. Verifica los datos e intenta nuevamente.'
            : 'No se pudo agregar el registro. Verifica los datos e intenta nuevamente.',
        );
      }
    } finally {
      this.saving.set(false);
    }
  }

  private resetEmpty(): void {
    this.periodo.set(this.periodoActual());
    this.concepto.set('administracion');
    this.valorCobrado.set(0);
    this.valorPagado.set(0);
    this.fechaPago.set('');
    this.estadoPago.set('pendiente');
    this.observaciones.set('');
  }
}
