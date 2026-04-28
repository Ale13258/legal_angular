import { Component, effect, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { Cuenta, EstadoCuenta, EtapaProceso, Propiedad, TipoCuenta } from '../../core/models';

@Component({
  selector: 'app-crear-cuenta-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 class="font-display text-lg font-bold text-foreground">
            {{ cuenta() ? 'Editar cuenta de cartera' : 'Nueva cuenta de cartera' }}
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
          @if (errorMsg()) {
            <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ errorMsg() }}
            </div>
          }

          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Número de cuenta</label>
            <input
              type="text"
              [value]="numeroCuenta()"
              (input)="numeroCuenta.set($any($event.target).value)"
              placeholder="Ej: CTA-2026-001"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Tipo de cuenta</label>
              <select
                [value]="tipo()"
                (change)="tipo.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                @for (opt of tipoOpciones; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
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
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Etapa del proceso</label>
            <select
              [value]="etapa()"
              (change)="etapa.set($any($event.target).value)"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              @for (opt of etapaOpciones; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>

          @if (!cuenta()) {
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Propiedad (opcional)</label>
              <select
                [value]="propiedadId()"
                (change)="propiedadId.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Sin vincular</option>
                @for (p of propiedades(); track p.id) {
                  <option [value]="p.id">{{ p.identificador }} — {{ p.direccion }}</option>
                }
              </select>
              <p class="text-xs text-muted-foreground mt-1">Si aplica, asocia la cuenta a una propiedad del cliente.</p>
            </div>
          }

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
              @if (saving()) {
                Guardando…
              } @else {
                {{ cuenta() ? 'Guardar cambios' : 'Crear cuenta' }}
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CrearCuentaDialog {
  open = input<boolean>(true);
  clienteId = input.required<string>();
  propiedades = input<Propiedad[]>([]);
  cuenta = input<Cuenta | null>(null);
  /** Lo incrementa el padre en cada apertura para hidratar el formulario con los datos vigentes. */
  cuentaFormNonce = input(0);
  openChange = output<boolean>();
  created = output<void>();

  numeroCuenta = signal('');
  tipo = signal<TipoCuenta>('juridica');
  estado = signal<EstadoCuenta>('activa');
  etapa = signal<EtapaProceso>('inicial');
  /** '' = sin propiedad */
  propiedadId = signal('');

  saving = signal(false);
  errorMsg = signal<string | null>(null);

  tipoOpciones: Array<{ value: TipoCuenta; label: string }> = [
    { value: 'juridica', label: 'JURÍDICO' },
    { value: 'extrajudicial', label: 'PRE-JURÍDICO' },
    { value: 'acuerdo_de_pago', label: 'ACUERDO DE PAGO' },
  ];

  estadoOpciones: Array<{ value: EstadoCuenta; label: string }> = [
    { value: 'activa', label: 'ACTIVA' },
    { value: 'en_proceso', label: 'EN PROCESO' },
    { value: 'cerrada', label: 'FINALIZADO' },
  ];

  etapaOpciones: Array<{ value: EtapaProceso; label: string }> = [
    { value: 'inicial', label: 'INICIAL' },
    { value: 'notificacion', label: 'NOTIFICACIÓN' },
    { value: 'conciliacion', label: 'CONCILIACIÓN' },
    { value: 'demanda', label: 'DEMANDA' },
    { value: 'ejecucion', label: 'EJECUCIÓN' },
  ];

  /**
   * Clave = apertura del modal + cuenta. Así al abrir “Editar” siempre se cargan los valores actuales;
   * mientras el usuario escribe, nonce e id no cambian y no se sobrescribe el formulario.
   */
  private lastSyncedFormKey: string | null = null;

  constructor(private data: DataService) {
    effect(() => {
      const nonce = this.cuentaFormNonce();
      const current = this.cuenta();
      const key = `${nonce}:${current?.id ?? '__nueva__'}`;
      if (this.lastSyncedFormKey === key) {
        return;
      }
      this.lastSyncedFormKey = key;
      if (current) {
        this.applyCuentaToForm(current);
      } else {
        this.reset();
      }
    });
  }

  private applyCuentaToForm(c: Cuenta): void {
    this.numeroCuenta.set(String(c.numero_cuenta ?? '').trim());
    this.tipo.set(this.coerceTipo(c.tipo));
    this.estado.set(this.coerceEstado(c.estado));
    this.etapa.set(this.coerceEtapa(c.etapa_proceso));
    const pid = c.propiedad_id;
    this.propiedadId.set(pid != null && String(pid).trim() !== '' ? String(pid) : '');
  }

  private coerceTipo(v: unknown): TipoCuenta {
    const s = String(v ?? '').trim() as TipoCuenta;
    return this.tipoOpciones.some((o) => o.value === s) ? s : 'juridica';
  }

  private coerceEstado(v: unknown): EstadoCuenta {
    const s = String(v ?? '').trim() as EstadoCuenta;
    return this.estadoOpciones.some((o) => o.value === s) ? s : 'activa';
  }

  private coerceEtapa(v: unknown): EtapaProceso {
    const s = String(v ?? '').trim() as EtapaProceso;
    return this.etapaOpciones.some((o) => o.value === s) ? s : 'inicial';
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    void this.guardar();
  }

  async guardar(): Promise<void> {
    const num = this.numeroCuenta().trim();
    if (!num) {
      this.errorMsg.set('Indica el número de cuenta.');
      return;
    }
    this.errorMsg.set(null);
    this.saving.set(true);
    try {
      const pid = this.propiedadId().trim();
      const current = this.cuenta();
      if (current) {
        await this.data.updateCuenta(current.id, {
          numero_cuenta: num,
          tipo: this.tipo(),
          estado: this.estado(),
          etapa_proceso: this.etapa(),
          ...(pid ? { propiedad_id: pid } : {}),
        });
      } else {
        await this.data.createCuenta({
          cliente_id: this.clienteId(),
          numero_cuenta: num,
          tipo: this.tipo(),
          estado: this.estado(),
          etapa_proceso: this.etapa(),
          ...(pid ? { propiedad_id: pid } : {}),
        });
      }
      this.reset();
      this.created.emit();
      this.openChange.emit(false);
    } catch {
      this.errorMsg.set(
        this.cuenta()
          ? 'No se pudo editar la cuenta. Revisa los datos o el servidor e intenta de nuevo.'
          : 'No se pudo crear la cuenta. Revisa los datos o el servidor e intenta de nuevo.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  private reset(): void {
    this.numeroCuenta.set('');
    this.tipo.set('juridica');
    this.estado.set('activa');
    this.etapa.set('inicial');
    this.propiedadId.set('');
    this.errorMsg.set(null);
  }
}
