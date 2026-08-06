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
        class="relative z-50 flex flex-col bg-card rounded-2xl shadow-lg border border-border w-full max-w-2xl max-h-[90vh]"
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
              @if (htmlSrcdoc()) {
                <iframe
                  title="Cuerpo del correo"
                  class="w-full min-h-[280px] h-[42vh] rounded-xl border border-border bg-white"
                  [attr.srcdoc]="htmlSrcdoc()"
                  sandbox=""
                ></iframe>
              } @else {
                <div
                  class="rounded-xl border border-border bg-background px-4 py-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words max-h-[42vh] overflow-y-auto"
                >
                  {{ bodyPlain() }}
                </div>
              }
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
  /** Id de la gestión para `GET /payment-reminders/:gestionId`. */
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

  /** HTML del correo para iframe `srcdoc` (aislado; sandbox sin scripts). */
  readonly htmlSrcdoc = computed(() => {
    const html = this.record()?.body_html?.trim();
    if (!html) return null;
    const previewHtml = this.rewriteCidImagesForPreview(html);
    if (/<html[\s>]/i.test(previewHtml) || /<body[\s>]/i.test(previewHtml)) {
      return previewHtml;
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:16px;font:14px/1.5 system-ui,sans-serif;color:#111}img{max-width:100%;height:auto}</style></head><body>${previewHtml}</body></html>`;
  });

  readonly bodyPlain = computed(() => {
    const r = this.record();
    if (!r) return '';
    const text = r.body_text?.trim();
    if (text) return text;
    return 'Sin contenido de mensaje.';
  });

  constructor() {
    effect(() => {
      const id = this.reminderId();
      if (!id) return;
      void this.load(id);
    });
  }

  /**
   * En el correo real las imágenes van como adjuntos MIME (`cid:…`).
   * En el navegador eso no existe; las mapeamos a `/brand/*` para la vista previa.
   */
  private rewriteCidImagesForPreview(html: string): string {
    const origin =
      typeof globalThis.location?.origin === 'string' ? globalThis.location.origin : '';
    const cidToAsset: Record<string, string> = {
      'legaltech-logo@legaltech': `${origin}/brand/legaltech-logo.png`,
      'icon-telefono@legaltech': `${origin}/brand/icon-telefono.png`,
      'icon-email@legaltech': `${origin}/brand/icon-email.png`,
      'icon-instagram@legaltech': `${origin}/brand/icon-instagram.png`,
    };
    let out = html;
    for (const [cid, asset] of Object.entries(cidToAsset)) {
      out = out.split(`cid:${cid}`).join(asset);
    }
    // Cualquier otro cid:… residual: ocultar imagen rota.
    out = out.replace(
      /<img\b([^>]*?)\bsrc=["']cid:[^"']+["']([^>]*)>/gi,
      '<img$1src=""$2 style="display:none" aria-hidden="true">'
    );
    return out;
  }

  private async load(gestionId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.record.set(null);
    try {
      const detail = await this.data.getPaymentReminderById(gestionId);
      this.record.set(detail);
    } catch (err) {
      this.error.set(this.extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
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
