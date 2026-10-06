import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { fadeInUp, fadeInUpStagger } from '../../core/animations/animations';
import type { Cliente } from '../../core/models';
import { DataService } from '../../core/services/data.service';
import {
  TutelasService,
  filtroPlazoDesdeQuery,
  plazoTutela,
  type FiltroPlazoTutela,
  type PlazoTutela,
  type Tutela,
} from '../../core/services/tutelas.service';
import { ETAPAS_TUTELA, labelEtapaTutela } from '../../core/tutela-etapas';
import { diasHabilesEntre, todayBogotaYmd } from '../../core/utils/dias-habiles-co';
import { TutelaDetalleDialog } from '../../components/tutela-detalle-dialog/tutela-detalle-dialog';
import { TutelaDialog } from '../../components/tutela-dialog/tutela-dialog';
import { StatusBadge } from '../../shared/status-badge/status-badge';

/** Radicación descendente; sin fecha al final (más reciente creada primero). */
function compararMasRecientePrimero(a: Tutela, b: Tutela): number {
  if (a.fecha_radicacion !== b.fecha_radicacion) {
    if (!a.fecha_radicacion) return 1;
    if (!b.fecha_radicacion) return -1;
    return b.fecha_radicacion.localeCompare(a.fecha_radicacion);
  }
  return b.created_at.localeCompare(a.created_at);
}

@Component({
  selector: 'app-tutelas-page',
  standalone: true,
  imports: [StatusBadge, TutelaDialog, TutelaDetalleDialog],
  animations: [fadeInUp, fadeInUpStagger],
  template: `
    <div class="min-h-screen">
      <div class="gradient-hero page-container pt-6 sm:pt-8 pb-10 sm:pb-12 rounded-b-[2rem]">
        <div
          class="w-full"
          [@fadeInUp]="{ value: '', params: { delay: 0, duration: 500, offset: 10, ease: 'ease-out' } }"
        >
          <h1 class="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
            Acciones de tutela
          </h1>
          <p class="text-primary-foreground/70 mb-6">Seguimiento de tutelas, plazos y etapas procesales</p>
        </div>
      </div>

      <div class="page-container -mt-6 space-y-4 pb-10">
        @if (error()) {
          <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {{ error() }}
          </div>
        }
        @if (info()) {
          <div class="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
            {{ info() }}
          </div>
        }

        <div class="interactive-card rounded-2xl border border-border/50 bg-card shadow-card p-4 sm:p-5">
          <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div class="relative flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                type="text"
                placeholder="Buscar por radicado, juzgado, accionante, accionado o cliente..."
                class="w-full min-w-0 rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
              />
            </div>
            <div class="relative shrink-0 sm:w-[200px]">
              <select
                [value]="filtroEtapa()"
                (change)="filtroEtapa.set($any($event.target).value)"
                class="w-full appearance-none rounded-xl border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todas">Etapas</option>
                @for (e of etapas; track e.value) {
                  <option [value]="e.value">{{ e.label }}</option>
                }
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><path d="m6 9 6 6 6-6" /></svg>
            </div>
            <div class="relative shrink-0 sm:w-[200px]">
              <select
                [value]="filtroPlazo()"
                (change)="filtroPlazo.set($any($event.target).value)"
                class="w-full appearance-none rounded-xl border border-input bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todos">Todos los plazos</option>
                <option value="vencida">Vencidas</option>
                <option value="por_vencer">Por vencer (≤ 2 días hábiles)</option>
                <option value="en_plazo">En plazo</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl shadow-card border border-border/50">
          <div class="flex flex-col gap-3 px-5 sm:px-6 py-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                Tutelas en curso
              </h2>
              @if (resumen().vencidas > 0) {
                <span class="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-semibold">
                  {{ resumen().vencidas }} vencida{{ resumen().vencidas === 1 ? '' : 's' }}
                </span>
              }
              @if (resumen().porVencer > 0) {
                <span class="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">
                  {{ resumen().porVencer }} por vencer
                </span>
              }
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                (click)="abrirNueva()"
                class="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Nueva tutela
              </button>
            </div>
          </div>

          @if (loading()) {
            <div class="px-6 py-8 text-sm text-muted-foreground">Cargando tutelas...</div>
          } @else if (filtradas().length === 0) {
            <div class="px-6 py-10 text-center text-sm text-muted-foreground">
              {{ service.tutelas().length === 0 ? 'Aún no hay tutelas registradas.' : 'Ninguna tutela coincide con los filtros.' }}
            </div>
          } @else {
            <div class="table-wrap">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border bg-muted/20">
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Radicación</th>
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Radicado</th>
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Juzgado</th>
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accionante</th>
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accionado</th>
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Derecho</th>
                    <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vencimiento</th>
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Etapa</th>
                    <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[8rem] max-w-[8rem]">Nota</th>
                    <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of filtradas(); track t.id; let i = $index) {
                    <tr
                      [@fadeInUpStagger]="{ value: '', params: { delay: i * 30, duration: 200, offset: 5, ease: 'ease-out' } }"
                      class="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td class="px-5 py-4 text-sm tabular-nums text-foreground whitespace-nowrap">{{ data.formatFechaCorta(t.fecha_radicacion) }}</td>
                      <td class="px-5 py-4 text-xs font-mono text-muted-foreground">{{ t.radicado || '—' }}</td>
                      <td class="px-5 py-4 text-sm text-muted-foreground max-w-[12rem]">{{ t.juzgado || '—' }}</td>
                      <td class="px-5 py-4 text-sm font-medium text-foreground">
                        {{ t.accionante }}
                        @if (t.cliente_nombre) {
                          <div class="text-xs font-normal text-muted-foreground mt-0.5">Cliente: {{ t.cliente_nombre }}</div>
                        }
                      </td>
                      <td class="px-5 py-4 text-sm text-foreground">{{ t.accionado }}</td>
                      <td class="px-5 py-4"><app-status-badge [label]="t.derecho" variant="default" /></td>
                      <td class="px-5 py-4 text-right text-sm whitespace-nowrap" [class]="plazoClass(t)">
                        <div class="font-medium tabular-nums">{{ data.formatFechaCorta(t.vencimiento) }}</div>
                        @if (plazoTexto(t); as texto) {
                          <div class="text-xs mt-0.5">{{ texto }}</div>
                        }
                      </td>
                      <td class="px-5 py-4">
                        <app-status-badge [label]="etapaLabel(t.etapa)" [variant]="'tutela_' + t.etapa" />
                      </td>
                      <td class="px-5 py-4 text-sm text-muted-foreground w-[8rem] max-w-[8rem]" [title]="t.nota || ''">
                        @if (t.nota) {
                          <p class="truncate text-foreground">{{ t.nota }}</p>
                        } @else {
                          —
                        }
                      </td>
                      <td class="px-5 py-4">
                        <div class="flex justify-end gap-2">
                          <button
                            type="button"
                            (click)="detalleTarget.set(t)"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                            title="Ver tutela"
                            aria-label="Ver tutela"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>
                          <button
                            type="button"
                            (click)="abrirEditar(t)"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                            title="Editar"
                            aria-label="Editar tutela"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </button>
                          <button
                            type="button"
                            (click)="deleteTarget.set(t)"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Eliminar"
                            aria-label="Eliminar tutela"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      @if (dialogOpen()) {
        <app-tutela-dialog
          [tutela]="editing()"
          [clientes]="clientes()"
          (openChange)="dialogOpen.set($event)"
          (saved)="onSaved()"
        />
      }

      @if (detalleTarget(); as target) {
        <app-tutela-detalle-dialog
          [tutela]="target"
          (openChange)="detalleTarget.set(null)"
          (editar)="detalleTarget.set(null); abrirEditar($event)"
        />
      }

      @if (deleteTarget(); as target) {
        <div class="fixed inset-0 z-40 bg-black/50"></div>
        <section class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 class="font-display text-xl font-semibold text-foreground mb-2">Eliminar tutela</h2>
            <p class="text-sm text-muted-foreground mb-6">
              ¿Eliminar la tutela de <strong>{{ target.accionante }}</strong> contra <strong>{{ target.accionado }}</strong>?
              Dejará de aparecer en la tabla y en las alertas, pero queda guardada en el sistema con la fecha y el usuario que la eliminó.
            </p>
            <div class="flex justify-end gap-3">
              <button
                type="button"
                (click)="deleteTarget.set(null)"
                class="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="eliminar(target)"
                [disabled]="deleting()"
                class="rounded-xl bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Eliminar
              </button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class TutelasPage implements OnInit {
  protected readonly service = inject(TutelasService);
  protected readonly data = inject(DataService);

  readonly etapas = ETAPAS_TUTELA;

  search = signal('');
  filtroEtapa = signal<string>('todas');
  filtroPlazo = signal<FiltroPlazoTutela>('todos');

  loading = signal(true);
  error = signal<string | null>(null);
  info = signal<string | null>(null);
  deleting = signal(false);

  dialogOpen = signal(false);
  editing = signal<Tutela | null>(null);
  deleteTarget = signal<Tutela | null>(null);
  detalleTarget = signal<Tutela | null>(null);
  clientes = signal<Cliente[]>([]);

  private readonly hoy = todayBogotaYmd();

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const filtro = filtroPlazoDesdeQuery(params.get('filtro'));
        if (filtro) this.filtroPlazo.set(filtro);
      });
  }

  resumen = computed(() => {
    let vencidas = 0;
    let porVencer = 0;
    for (const t of this.service.tutelas()) {
      const p = plazoTutela(t, this.hoy);
      if (p === 'vencida') vencidas += 1;
      else if (p === 'por_vencer') porVencer += 1;
    }
    return { vencidas, porVencer };
  });

  filtradas = computed(() => {
    const q = this.search().trim().toLowerCase();
    const etapa = this.filtroEtapa();
    const plazo = this.filtroPlazo();
    return this.service
      .tutelas()
      .filter((t) => {
        if (etapa !== 'todas' && t.etapa !== etapa) return false;
        if (plazo !== 'todos' && plazoTutela(t, this.hoy) !== plazo) return false;
        if (!q) return true;
        return [t.radicado, t.juzgado, t.accionante, t.accionado, t.cliente_nombre, t.derecho, t.nota]
          .some((v) => (v ?? '').toLowerCase().includes(q));
      })
      .sort(compararMasRecientePrimero);
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.service.load();
    } catch (error: unknown) {
      this.error.set(this.service.extractErrorMessage(error, 'No se pudieron cargar las tutelas.'));
    } finally {
      this.loading.set(false);
    }
    try {
      const cached = this.data.getClientes();
      this.clientes.set(cached.length > 0 ? cached : await this.data.loadClientes());
    } catch {
      this.clientes.set([]);
    }
  }

  etapaLabel(etapa: string): string {
    return labelEtapaTutela(etapa);
  }

  private plazo(t: Tutela): PlazoTutela {
    return plazoTutela(t, this.hoy);
  }

  plazoClass(t: Tutela): string {
    const p = this.plazo(t);
    if (p === 'vencida') return 'text-red-700 dark:text-red-400';
    if (p === 'por_vencer') return 'text-amber-700 dark:text-amber-400';
    return 'text-foreground';
  }

  plazoTexto(t: Tutela): string | null {
    const p = this.plazo(t);
    if (!t.fecha_radicacion && !t.vencimiento) return 'Sin radicación';
    if (!t.vencimiento || p === 'cerrada' || p === 'sin_vencimiento') return null;
    if (p === 'vencida') return 'Vencida';
    const restantes = diasHabilesEntre(this.hoy, t.vencimiento);
    if (restantes === 0) return 'Vence hoy';
    return restantes === 1 ? 'Falta 1 día hábil' : `Faltan ${restantes} días hábiles`;
  }

  abrirNueva(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  abrirEditar(t: Tutela): void {
    this.editing.set(t);
    this.dialogOpen.set(true);
  }

  onSaved(): void {
    this.info.set(null);
    this.error.set(null);
  }

  async eliminar(t: Tutela): Promise<void> {
    this.deleting.set(true);
    try {
      await this.service.remove(t.id);
      this.deleteTarget.set(null);
    } catch (error: unknown) {
      this.error.set(this.service.extractErrorMessage(error, 'No se pudo eliminar la tutela.'));
    } finally {
      this.deleting.set(false);
    }
  }
}
