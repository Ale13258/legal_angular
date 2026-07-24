import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { PaymentReminderEmailRecord } from '../../core/models';

@Component({
  selector: 'app-email-reminder-detail-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div
        class="relative z-50 flex flex-col bg-card rounded-2xl shadow-lg border border-border w-full max-w-xl max-h-[90vh]"
        (click)="$event.stopPropagation()"
      >
        <div class="shrink-0 border-b border-border px-5 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Correo enviado
            </p>
            <h2 class="font-display text-lg font-bold text-foreground leading-snug break-words">
              {{ record()?.subject?.trim() || 'Recordatorio de pago' }}
            </h2>
          </div>
          <button
            type="button"
            (click)="openChange.emit(false)"
            class="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          @if (loading()) {
            <p class="text-sm text-muted-foreground">Cargando correo…</p>
          } @else if (error()) {
            <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ error() }}
            </div>
          } @else if (record()) {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Enviado</p>
                <p class="text-sm font-medium tabular-nums text-foreground">
                  {{ data.formatFechaHora(record()!.sent_at, record()!.created_at) }}
                </p>
              </div>
              <div class="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Estado</p>
                <p class="text-sm font-semibold text-foreground">{{ statusLabel() }}</p>
              </div>
              <div class="rounded-xl border border-border bg-muted/30 px-3.5 py-3 sm:col-span-2">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Para</p>
                <p class="text-sm font-medium text-foreground break-all">{{ record()!.cliente_email }}</p>
              </div>
              @if (extrasLabel()) {
                <div class="rounded-xl border border-border bg-muted/30 px-3.5 py-3 sm:col-span-2">
                  <p class="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Copia</p>
                  <p class="text-sm font-medium text-foreground break-all">{{ extrasLabel() }}</p>
                </div>
              }
            </div>

            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <h3 class="text-sm font-semibold text-foreground">Mensaje</h3>
              </div>
              <div
                class="rounded-xl border border-border bg-background px-4 py-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words max-h-[42vh] overflow-y-auto"
              >
                {{ bodyPlain() }}
              </div>
            </div>
          }
        </div>

        <div class="shrink-0 border-t border-border px-5 sm:px-6 py-4">
          <button
            type="button"
            (click)="openChange.emit(false)"
            class="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class EmailReminderDetailDialog {
  open = input(true);
  reminderId = input.required<string>();
  openChange = output<boolean>();

  protected readonly data = inject(DataService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly record = signal<PaymentReminderEmailRecord | null>(null);

  readonly extrasLabel = computed(() => {
    const extras = this.record()?.extra_recipients ?? [];
    return extras.length ? extras.join(', ') : null;
  });

  readonly statusLabel = computed(() => {
    const status = String(this.record()?.status ?? '').toLowerCase();
    if (status === 'sent') return 'Enviado';
    if (status === 'queued') return 'En cola';
    if (status === 'failed') return 'Fallido';
    return this.record()?.status || '—';
  });

  /** Preferimos texto plano: el HTML del correo usa CID y se ve roto en el navegador. */
  readonly bodyPlain = computed(() => {
    const r = this.record();
    if (!r) return '';
    const text = r.body_text?.trim();
    if (text) return text;
    const html = r.body_html?.trim();
    if (!html) return 'Sin contenido de mensaje.';
    return this.htmlToPlain(html);
  });

  constructor() {
    effect(() => {
      const id = this.reminderId();
      if (!id) return;
      void this.load(id);
    });
  }

  private async load(reminderId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.record.set(null);
    try {
      const detail = await this.data.getPaymentReminderById(reminderId);
      this.record.set(detail);
    } catch (err) {
      this.error.set(this.extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private htmlToPlain(html: string): string {
    const withBreaks = html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*p\s*>/gi, '\n\n')
      .replace(/<\/\s*div\s*>/gi, '\n')
      .replace(/<\/\s*tr\s*>/gi, '\n')
      .replace(/<\/\s*li\s*>/gi, '\n');
    const stripped = withBreaks.replace(/<[^>]+>/g, ' ');
    return stripped
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: unknown } | null;
      if (typeof body?.message === 'string' && body.message.trim()) return body.message;
      if (error.status === 404) return 'No se encontró el correo de recordatorio.';
      if (error.status === 403) return 'No tienes permisos para ver este correo.';
    }
    return 'No se pudo cargar el detalle del correo.';
  }
}
