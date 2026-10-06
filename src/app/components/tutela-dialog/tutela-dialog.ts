import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import type { Cliente } from '../../core/models';
import { DataService } from '../../core/services/data.service';
import { TutelasService, type Tutela } from '../../core/services/tutelas.service';
import {
  DERECHOS_TUTELA_SUGERIDOS,
  ETAPAS_TUTELA,
  calcularVencimientoEtapa,
  coerceEtapaTutela,
  descripcionTerminoEtapa,
  type EtapaTutela,
} from '../../core/tutela-etapas';
import { todayBogotaYmd } from '../../core/utils/dias-habiles-co';

@Component({
  selector: 'app-tutela-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 class="font-display text-lg font-bold text-foreground">
            {{ tutela() ? 'Editar tutela' : 'Nueva tutela' }}
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

        <form (submit)="onSubmit($event)" class="p-6 space-y-4">
          @if (errorMsg()) {
            <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ errorMsg() }}
            </div>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Fecha de radicación</label>
              <input
                type="date"
                [value]="fechaRadicacion()"
                (input)="onFechaRadicacion($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Radicado</label>
              <input
                type="text"
                [value]="radicado()"
                (input)="radicado.set($any($event.target).value)"
                placeholder="Ej: 13001-40-03-005-2026-00123-00"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Juzgado</label>
            <input
              type="text"
              [value]="juzgado()"
              (input)="juzgado.set($any($event.target).value)"
              placeholder="Ej: Juzgado 5 Civil Municipal de Cartagena"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Accionante *</label>
              <input
                type="text"
                [value]="accionante()"
                (input)="accionante.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Accionado *</label>
              <input
                type="text"
                [value]="accionado()"
                (input)="accionado.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Cliente (opcional)</label>
              <select
                [value]="clienteId()"
                (change)="clienteId.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Sin cliente asociado</option>
                @for (c of clientes(); track c.id) {
                  <option [value]="c.id" [selected]="c.id === clienteId()">{{ c.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Derecho</label>
              <input
                type="text"
                list="tutela-derechos"
                [value]="derecho()"
                (input)="derecho.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <datalist id="tutela-derechos">
                @for (d of derechosSugeridos; track d) {
                  <option [value]="d"></option>
                }
              </datalist>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Etapa</label>
              <select
                [value]="etapa()"
                (change)="onEtapa($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                @for (opt of etapas; track opt.value) {
                  <option [value]="opt.value" [selected]="opt.value === etapa()">
                    {{ opt.label }}{{ opt.dias ? ' (' + opt.dias + ' días)' : '' }}
                  </option>
                }
              </select>
              <p class="text-xs text-muted-foreground mt-1">{{ terminoEtapa() }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Inicio de la etapa</label>
              <input
                type="date"
                [value]="fechaEtapa()"
                (input)="onFechaEtapa($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p class="text-xs text-muted-foreground mt-1">Se pone hoy al cambiar de etapa.</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Vencimiento</label>
              <input
                type="date"
                [value]="vencimiento()"
                (input)="vencimiento.set($any($event.target).value)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              @if (vencimientoAuto() && vencimiento() !== vencimientoAuto()) {
                <p class="text-xs text-muted-foreground mt-1">
                  Calculado: {{ data.formatFechaCorta(vencimientoAuto()) }} ·
                  <button type="button" (click)="vencimiento.set(vencimientoAuto())" class="font-medium text-primary hover:underline">
                    Usar calculado
                  </button>
                </p>
              } @else {
                <p class="text-xs text-muted-foreground mt-1">Automático según la etapa; puedes cambiarlo.</p>
              }
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Nota</label>
            <textarea
              rows="2"
              maxlength="500"
              [value]="nota()"
              (input)="nota.set($any($event.target).value)"
              placeholder="Ej: Pendiente enviar informe al juzgado"
              class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            ></textarea>
            <p class="text-xs text-muted-foreground mt-1">Sale en el correo de alerta de vencimiento.</p>
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
              @if (saving()) {
                Guardando…
              } @else {
                {{ tutela() ? 'Guardar cambios' : 'Crear tutela' }}
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TutelaDialog implements OnInit {
  private readonly service = inject(TutelasService);
  protected readonly data = inject(DataService);

  tutela = input<Tutela | null>(null);
  clientes = input<Cliente[]>([]);
  openChange = output<boolean>();
  saved = output<Tutela>();

  fechaRadicacion = signal('');
  radicado = signal('');
  juzgado = signal('');
  accionante = signal('');
  accionado = signal('');
  clienteId = signal('');
  derecho = signal('PETICION');
  etapa = signal<EtapaTutela>('radicacion');
  fechaEtapa = signal('');
  vencimiento = signal('');
  readonly vencimientoAuto = computed(() =>
    calcularVencimientoEtapa({
      etapa: this.etapa(),
      fecha_etapa: this.fechaEtapa(),
      fecha_radicacion: this.fechaRadicacion(),
    }),
  );
  readonly terminoEtapa = computed(() => descripcionTerminoEtapa(this.etapa()));
  nota = signal('');

  saving = signal(false);
  errorMsg = signal<string | null>(null);

  readonly etapas = ETAPAS_TUTELA;
  readonly derechosSugeridos = DERECHOS_TUTELA_SUGERIDOS;

  ngOnInit(): void {
    const t = this.tutela();
    if (!t) {
      this.onFechaRadicacion(todayBogotaYmd());
      return;
    }
    this.fechaRadicacion.set(t.fecha_radicacion ?? '');
    this.etapa.set(coerceEtapaTutela(t.etapa));
    this.fechaEtapa.set(t.fecha_etapa ?? '');
    this.vencimiento.set(t.vencimiento ?? this.vencimientoAuto());
    this.radicado.set(t.radicado ?? '');
    this.juzgado.set(t.juzgado ?? '');
    this.accionante.set(t.accionante);
    this.accionado.set(t.accionado);
    this.clienteId.set(t.cliente_id ?? '');
    this.derecho.set(t.derecho);
    this.nota.set(t.nota ?? '');
  }

  onFechaRadicacion(value: string): void {
    this.fechaRadicacion.set(value);
    if (this.etapa() === 'radicacion') this.fechaEtapa.set(value);
    this.aplicarVencimientoAuto();
  }

  onEtapa(value: string): void {
    const etapa = coerceEtapaTutela(value);
    this.etapa.set(etapa);
    this.fechaEtapa.set(etapa === 'radicacion' && this.fechaRadicacion() ? this.fechaRadicacion() : todayBogotaYmd());
    this.aplicarVencimientoAuto();
  }

  onFechaEtapa(value: string): void {
    this.fechaEtapa.set(value);
    this.aplicarVencimientoAuto();
  }

  /** FINALIZADA conserva el último vencimiento; OTRO lo deja vacío para escribirlo a mano. */
  private aplicarVencimientoAuto(): void {
    const auto = this.vencimientoAuto();
    if (auto || this.etapa() === 'otro') this.vencimiento.set(auto);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.guardar();
  }

  private async guardar(): Promise<void> {
    const accionante = this.accionante().trim();
    const accionado = this.accionado().trim();
    if (!accionante || !accionado) {
      this.errorMsg.set('Indica el accionante y el accionado.');
      return;
    }
    const orNull = (v: string) => (v.trim() === '' ? null : v.trim());
    const payload = {
      cliente_id: orNull(this.clienteId()),
      fecha_radicacion: orNull(this.fechaRadicacion()),
      vencimiento: orNull(this.vencimiento()),
      radicado: orNull(this.radicado()),
      juzgado: orNull(this.juzgado()),
      accionante,
      accionado,
      derecho: this.derecho().trim().toUpperCase() || 'PETICION',
      etapa: this.etapa(),
      fecha_etapa: orNull(this.fechaEtapa()),
      nota: orNull(this.nota()),
    };

    this.errorMsg.set(null);
    this.saving.set(true);
    try {
      const current = this.tutela();
      const result = current
        ? await this.service.update(current.id, payload)
        : await this.service.create(payload);
      this.saved.emit(result);
      this.openChange.emit(false);
    } catch (error: unknown) {
      this.errorMsg.set(this.service.extractErrorMessage(error, 'No se pudo guardar la tutela.'));
    } finally {
      this.saving.set(false);
    }
  }
}
