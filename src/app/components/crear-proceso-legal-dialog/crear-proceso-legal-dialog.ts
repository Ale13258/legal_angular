import { Component, effect, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { ProcesoLegal, EstadoProcesoLegal, EtapaProceso, Cuenta, TipoProcesoLegal } from '../../core/models';
import {
  coerceEstadoProcesoLegal,
  ESTADOS_PROCESO_LEGAL_UI,
} from '../../core/proceso-estado';
import {
  ETAPA_PROCESO_DEFAULT,
  ETAPAS_PROCESO_ORDENADAS,
  coerceEtapaProceso,
} from '../../core/proceso-etapas';

@Component({
  selector: 'app-crear-proceso-legal-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 class="font-display text-lg font-bold text-foreground">
            {{ cuenta() ? 'Editar radicado' : 'Nuevo radicado' }}
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
            <label class="block text-sm font-medium text-foreground mb-1.5">No. RADICADO</label>
            <input
              type="text"
              [value]="numeroProceso()"
              (input)="numeroProceso.set($any($event.target).value)"
              placeholder="Ej: 2026-001"
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
              @for (opt of etapasProceso; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>

          @if (!cuenta()) {
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Cuenta (opcional)</label>
              <select
                [value]="cuentaId()"
                (change)="cuentaId.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Sin vincular</option>
                @for (p of cuentas(); track p.id) {
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
                {{ cuenta() ? 'Guardar cambios' : 'Crear radicado' }}
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CrearProcesoLegalDialog {
  open = input<boolean>(true);
  clienteId = input.required<string>();
  cuentas = input<Cuenta[]>([]);
  cuenta = input<ProcesoLegal | null>(null);
  /** Lo incrementa el padre en cada apertura para hidratar el formulario con los datos vigentes. */
  cuentaFormNonce = input(0);
  openChange = output<boolean>();
  created = output<void>();

  numeroProceso = signal('');
  tipo = signal<TipoProcesoLegal>('juridica');
  estado = signal<EstadoProcesoLegal>('en_proceso');
  etapa = signal<EtapaProceso>(ETAPA_PROCESO_DEFAULT);
  /** '' = sin cuenta */
  cuentaId = signal('');

  saving = signal(false);
  errorMsg = signal<string | null>(null);

  tipoOpciones: Array<{ value: TipoProcesoLegal; label: string }> = [
    { value: 'juridica', label: 'JURÍDICO' },
    { value: 'extrajudicial', label: 'PRE-JURÍDICO' },
    { value: 'acuerdo_de_pago', label: 'ACUERDO DE PAGO' },
  ];

  estadoOpciones: Array<{ value: EstadoProcesoLegal; label: string }> = ESTADOS_PROCESO_LEGAL_UI;

  /** Catálogo de 13 etapas del proceso de radicación (fuente: proceso-etapas.ts). */
  readonly etapasProceso = ETAPAS_PROCESO_ORDENADAS;

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
        this.applyProcesoLegalToForm(current);
      } else {
        this.reset();
      }
    });
  }

  private applyProcesoLegalToForm(c: ProcesoLegal): void {
    this.numeroProceso.set(String(c.numero_cuenta ?? '').trim());
    this.tipo.set(this.coerceTipo(c.tipo));
    this.estado.set(this.coerceEstado(c.estado));
    this.etapa.set(this.coerceEtapa(c.etapa_proceso));
    const pid = c.cuenta_id;
    this.cuentaId.set(pid != null && String(pid).trim() !== '' ? String(pid) : '');
  }

  private coerceTipo(v: unknown): TipoProcesoLegal {
    const s = String(v ?? '').trim() as TipoProcesoLegal;
    return this.tipoOpciones.some((o) => o.value === s) ? s : 'juridica';
  }

  private coerceEstado(v: unknown): EstadoProcesoLegal {
    return coerceEstadoProcesoLegal(v);
  }

  private coerceEtapa(v: unknown): EtapaProceso {
    return coerceEtapaProceso(v);
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    void this.guardar();
  }

  async guardar(): Promise<void> {
    const num = this.numeroProceso().trim();
    if (!num) {
      this.errorMsg.set('Indica el No. RADICADO.');
      return;
    }
    this.errorMsg.set(null);
    this.saving.set(true);
    try {
      const pid = this.cuentaId().trim();
      const current = this.cuenta();
      if (current) {
        await this.data.updateProcesoLegal(current.id, {
          numero_cuenta: num,
          tipo: this.tipo(),
          estado: this.estado(),
          etapa_proceso: this.etapa(),
          ...(pid ? { cuenta_id: pid } : {}),
        });
      } else {
        await this.data.createProcesoLegal({
          cliente_id: this.clienteId(),
          numero_cuenta: num,
          tipo: this.tipo(),
          estado: this.estado(),
          etapa_proceso: this.etapa(),
          ...(pid ? { cuenta_id: pid } : {}),
        });
      }
      this.reset();
      this.created.emit();
      this.openChange.emit(false);
    } catch {
      this.errorMsg.set(
        this.cuenta()
          ? 'No se pudo editar el radicado. Revisa los datos o el servidor e intenta de nuevo.'
          : 'No se pudo crear el radicado. Revisa los datos o el servidor e intenta de nuevo.'
      );
    } finally {
      this.saving.set(false);
    }
  }

  private reset(): void {
    this.numeroProceso.set('');
    this.tipo.set('juridica');
    this.estado.set('en_proceso');
    this.etapa.set(ETAPA_PROCESO_DEFAULT);
    this.cuentaId.set('');
    this.errorMsg.set(null);
  }
}
