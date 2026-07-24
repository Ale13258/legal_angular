import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { DataService, type PaymentReminderEmailAttachmentPayload } from '../../core/services/data.service';
import type { Propiedad } from '../../core/models';
import {
  buildCustomReminderBodyHtml,
  buildCustomReminderBodyPlain,
  formatLegalParagraphInnerHtml,
  type LegalReminderBodyContext,
} from '../../core/utils/payment-reminder-legal-body';
import { collectPropiedadEmails } from '../../core/utils/normalize-propiedad-deudores';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;

/** Deben coincidir con back-legal/payment-reminder-email-assets.ts */
const REMINDER_EMAIL_CID = {
  logo: 'legaltech-logo@legaltech',
  phone: 'icon-telefono@legaltech',
  email: 'icon-email@legaltech',
  instagram: 'icon-instagram@legaltech',
} as const;

const REMINDER_CONTACT = {
  phoneDisplay: '+573027636712',
  phoneTel: '+573027636712',
  emails: [
    'analistalegal@abogadosdigitales.com.co',
    'abogadojunior@abogadosdigitales.com.co',
  ],
} as const;

const TEXTO_INQUIETUDES = `Cualquier inquietud al respecto será atendida en el teléfono ${REMINDER_CONTACT.phoneDisplay} y los correos: ${REMINDER_CONTACT.emails[0]} y ${REMINDER_CONTACT.emails[1]}.`;

const INSTAGRAM_URL =
  'https://www.instagram.com/legaltechabogadosdigitales?igsh=MTFjOWVnbGsxYm85aw%3D%3D';

const MAX_EXTRA_RECIPIENTS = 5;

type ReminderAttachment = {
  id: string;
  filename: string;
  mime_type: string;
  sizeBytes: number;
  content_base64: string;
};

@Component({
  selector: 'app-payment-reminder-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div
        class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <h2 class="font-display text-xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Notificación de Recordatorio de Pago
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

        <div class="p-6 space-y-5">
          <!-- Destinatario y Asunto -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-foreground mb-1.5">Destinatario</label>
              <input
                #destInput
                type="text"
                (input)="onDestinatariosInput($event)"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              @if (destinatarioExtraError()) {
                <p class="text-xs text-destructive mt-1.5">{{ destinatarioExtraError() }}</p>
              }
              <p class="text-xs text-muted-foreground mt-1">El primer correo es el de cobro (no editable). Agregue otros después de la coma.</p>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-foreground mb-1.5">Asunto</label>
              <input
                type="text"
                [value]="asunto()"
                (input)="asunto.set($any($event.target).value)"
                maxlength="200"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <!-- Componer correo: cabecera + cuerpo editable + pie -->
          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Componer correo</h3>
            <div class="mb-3">
              <label class="block text-sm font-medium text-foreground mb-1.5">Cuerpo del mensaje</label>
              <textarea
                [value]="cuerpoPersonalizado()"
                (input)="cuerpoPersonalizado.set($any($event.target).value)"
                rows="8"
                placeholder="Escriba aquí el cuerpo del correo. Separe párrafos con una línea en blanco."
                class="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              ></textarea>
              <p class="text-xs text-muted-foreground mt-1.5">
                La vista previa y el correo enviado muestran este texto; si está vacío, el cuerpo queda en blanco.
              </p>
            </div>
            <div class="border border-border overflow-hidden bg-[#ececec] p-4">
              <div class="mx-auto max-w-[600px] bg-white border border-[#dddddd] overflow-hidden shadow-sm">
              <!-- Cabecera del email -->
              <div class="text-white px-6 py-5 flex flex-wrap items-center gap-4" style="background-color:#611374;">
                <img src="/brand/legaltech-logo.png" alt="LegalTech" width="48" height="48" class="h-12 w-12 rounded-[10px] shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="font-display font-bold text-lg leading-tight">LegalTech</p>
                  <p class="text-sm text-white/90">Departamento de Cartera</p>
                </div>
                <p class="text-sm text-white/95 font-medium ml-auto shrink-0">{{ fecha }}</p>
              </div>

              <div class="px-7 py-6 text-[14px] text-[#333] font-[Arial,Helvetica,sans-serif] leading-snug">
                <p class="mb-2 text-justify">Estimado(a) <strong>{{ nombreDestinatario() }}</strong>,</p>

                @for (parrafo of parrafosPersonalizados(); track $index) {
                  <p class="mb-2 text-[#333] text-justify leading-snug" [innerHTML]="parrafoPreviewHtml(parrafo)"></p>
                }

                <p class="mb-2 text-sm text-[#666] text-justify">
                  Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo.
                </p>
                <p class="mb-2 text-sm text-[#666]">
                  Cualquier inquietud al respecto será atendida en el teléfono
                  <a href="tel:+573027636712" class="text-[#611374] underline">{{ reminderContact.phoneDisplay }}</a>
                  y los correos:
                  <a href="mailto:analistalegal@abogadosdigitales.com.co" class="text-[#611374] underline break-all">{{ reminderContact.emails[0] }}</a>
                  y
                  <a href="mailto:abogadojunior@abogadosdigitales.com.co" class="text-[#611374] underline break-all">{{ reminderContact.emails[1] }}</a>.
                </p>
                <p class="text-[#333]">
                  Cordialmente,<br />
                  <strong>Departamento de Cartera</strong><br />
                  LegalTech
                </p>
              </div>

              <div class="text-white overflow-hidden" style="background-color:#611374;">
                <div class="grid grid-cols-[auto_1fr_1.2fr_auto] items-stretch gap-0 px-3 py-4 sm:px-4">
                  <a href="https://abogadosdigitales.com.co/" target="_blank" rel="noopener" class="flex justify-center px-2">
                    <img src="/brand/legaltech-logo.png" alt="LegalTech" width="56" height="56" class="h-14 w-14 rounded-[10px]" />
                  </a>
                  <div class="px-3 py-1 min-w-0 border-l border-[#b884ca]">
                    <a href="https://abogadosdigitales.com.co/" target="_blank" rel="noopener" class="block hover:opacity-90">
                      <p class="font-bold text-sm tracking-wide leading-tight">LEGALTECH</p>
                      <p class="text-[10px] tracking-widest mt-0.5">ABOGADOS DIGITALES</p>
                    </a>
                    <a href="https://abogadosdigitales.com.co/" target="_blank" rel="noopener" class="text-[11px] text-[#eeacff] underline mt-1.5 inline-block">abogadosdigitales.com.co</a>
                  </div>
                  <div class="px-3 py-1 text-xs italic text-white/95 space-y-2 border-l border-[#b884ca]">
                    <p class="flex items-start gap-2">
                      <img [src]="iconUrl('icon-telefono.png')" alt="" width="18" height="18" class="shrink-0 mt-0.5" />
                      <a href="tel:+573027636712" class="text-white hover:underline">{{ reminderContact.phoneDisplay }}</a>
                    </p>
                    @for (email of reminderContact.emails; track email) {
                      <p class="flex items-start gap-2">
                        <img [src]="iconUrl('icon-email.png')" alt="" width="18" height="18" class="shrink-0 mt-0.5" />
                        <a [href]="'mailto:' + email" class="text-white hover:underline break-all">{{ email }}</a>
                      </p>
                    }
                  </div>
                  <div class="px-2 py-1 text-center border-l border-[#b884ca]">
                    <p class="text-[11px] font-bold tracking-wide mb-2">SÍGUENOS</p>
                    <a [href]="instagramUrl" target="_blank" rel="noopener" class="inline-block">
                      <img [src]="iconUrl('icon-instagram.png')" alt="Instagram" width="28" height="28" />
                    </a>
                  </div>
                </div>
                <p class="text-center text-[10px] text-white/90 pb-3 px-4">© {{ footerYear }} LegalTech | Todos los derechos reservados.</p>
              </div>
              </div>
            </div>
          </div>

          <!-- Adjuntos -->
          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Archivos adjuntos</h3>
            <p class="text-xs text-muted-foreground mb-3">
              Opcional. Máximo {{ maxAttachments }} archivos, 5 MB c/u y 15 MB en total (PDF, Word, Excel, imágenes).
            </p>
            <label
              class="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Seleccionar archivos
              <input
                type="file"
                multiple
                class="sr-only"
                (change)="onAdjuntosSeleccionados($event)"
                [disabled]="sending() || adjuntos().length >= maxAttachments"
              />
            </label>
            @if (adjuntoError()) {
              <p class="mt-2 text-sm text-destructive">{{ adjuntoError() }}</p>
            }
            @if (adjuntos().length > 0) {
              <ul class="mt-3 space-y-2">
                @for (adj of adjuntos(); track adj.id) {
                  <li class="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                    <div class="min-w-0">
                      <p class="font-medium text-foreground truncate">{{ adj.filename }}</p>
                      <p class="text-xs text-muted-foreground">{{ formatBytes(adj.sizeBytes) }}</p>
                    </div>
                    <button
                      type="button"
                      (click)="quitarAdjunto(adj.id)"
                      [disabled]="sending()"
                      class="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- Datos de la propiedad -->
          <div class="rounded-xl bg-muted/50 p-4">
            <h3 class="text-sm font-semibold text-foreground mb-3">DATOS DE LA PROPIEDAD</h3>
            <p class="font-medium text-foreground">Propiedad: {{ propiedad().identificador }}</p>
            <p class="font-medium text-foreground">Dirección: {{ propiedad().direccion }}</p>
            <p class="font-medium text-foreground">Contacto de cobro: {{ nombreDestinatario() }}</p>
          </div>

          <!-- Mensaje automático -->
          <div class="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Este es un mensaje automático del sistema de gestión de cartera. Si tiene alguna consulta, comuníquese con el Departamento de Cartera.
          </div>

          <!-- Resumen -->
          <div class="rounded-xl bg-muted/50 p-4">
            <h3 class="text-sm font-semibold text-foreground mb-3">Resumen</h3>
            <p class="text-sm text-foreground">Contacto de cobro: {{ nombreDestinatario() }} - {{ destinatario() }}</p>
            <p class="text-sm text-foreground">Propiedad: {{ propiedad().identificador }}</p>
            <p class="text-sm font-bold text-destructive mt-2">Monto pendiente: {{ data.formatCurrency(montoPendiente()) }}</p>
          </div>

          @if (sendError()) {
            <p class="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {{ sendError() }}
            </p>
          }
          @if (sendSuccess()) {
            <p class="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground" role="status">
              {{ sendSuccess() }}
            </p>
          }

          <!-- Acciones -->
          <div class="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              (click)="enviarCorreo()"
              [disabled]="sending() || !puedeEnviar()"
              class="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {{ sending() ? 'Enviando…' : 'Enviar correo' }}
            </button>
            <button
              type="button"
              (click)="copiarTexto()"
              [disabled]="sending()"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              Copiar Texto
            </button>
            <button
              type="button"
              (click)="copiarHtml()"
              [disabled]="sending()"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              Copiar HTML
            </button>
          </div>
          @if (!puedeEnviar() && !sending()) {
            <p class="text-xs text-muted-foreground">
              Para enviar se requiere correo de cobro, asunto y monto pendiente mayor a cero.
            </p>
          }
        </div>
      </div>
    </div>
  `,
})
export class PaymentReminderDialog {
  open = input<boolean>(true);
  propiedad = input.required<Propiedad>();
  openChange = output<boolean>();
  /** Emitido cuando el backend confirma `status === 'sent'` (la gestión la crea el servidor). */
  sent = output<void>();

  private sanitizer = inject(DomSanitizer);
  destinatario = signal('');
  asunto = signal('');
  destinatariosCampo = signal('');
  destinatarioExtraError = signal<string | null>(null);
  private destInput = viewChild<ElementRef<HTMLInputElement>>('destInput');
  cuerpoPersonalizado = signal('');
  adjuntos = signal<ReminderAttachment[]>([]);
  adjuntoError = signal<string | null>(null);
  sending = signal(false);
  sendError = signal<string | null>(null);
  sendSuccess = signal<string | null>(null);
  readonly maxAttachments = MAX_ATTACHMENTS;
  readonly reminderContact = REMINDER_CONTACT;
  readonly instagramUrl = INSTAGRAM_URL;

  fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  footerYear = new Date().getFullYear();

  nombreDestinatario = computed(() => this.propiedad().cobro_nombre?.trim() ?? '');
  nombreCopropiedad = computed(() => {
    const p = this.propiedad();
    const cliente = this.data.getClienteById(p.cliente_id);
    return cliente?.nombre?.trim() || p.direccion?.trim() || '—';
  });
  parrafosPersonalizados = computed(() => buildCustomReminderBodyPlain(this.cuerpoPersonalizado()));
  /** Misma lógica que "Deuda a la fecha" en el detalle: saldo − pagos (se actualiza con el historial). */
  montoPendiente = computed(() =>
    this.data.getDeudaActualParaPropiedad(this.propiedad())
  );
  puedeEnviar = computed(() => {
    const email = this.destinatario().trim();
    const subject = this.asunto().trim();
    return Boolean(email) && Boolean(subject) && this.montoPendiente() > 0;
  });

  /** Evita reiniciar el borrador mientras el usuario escribe si la propiedad se refresca en segundo plano. */
  private lastSyncedPropiedadKey: string | null = null;

  constructor(protected data: DataService) {
    effect(() => {
      if (!this.open()) {
        this.lastSyncedPropiedadKey = null;
        return;
      }
      const p = this.propiedad();
      const key = p.id;
      if (this.lastSyncedPropiedadKey === key) return;
      this.lastSyncedPropiedadKey = key;

      const emails = collectPropiedadEmails(p);
      const primary = emails[0] ?? p.cobro_email?.trim() ?? '';
      const extras = emails.slice(1, 1 + MAX_EXTRA_RECIPIENTS);
      this.destinatario.set(primary);
      const extrasSuffix = extras.length ? `${extras.join(', ')}, ` : '';
      const campo = primary ? `${primary}, ${extrasSuffix}` : extrasSuffix;
      this.destinatariosCampo.set(campo);
      queueMicrotask(() => {
        const el = this.destInput()?.nativeElement;
        if (el) el.value = campo;
      });
      this.asunto.set(`Recordatorio de pago - ${p.identificador}`);
      this.destinatarioExtraError.set(null);
      this.cuerpoPersonalizado.set('');
      this.adjuntos.set([]);
      this.adjuntoError.set(null);
      this.sendError.set(null);
      this.sendSuccess.set(null);
    });
  }

  onDestinatariosInput(event: Event): void {
    this.destinatarioExtraError.set(null);
    const input = event.target as HTMLInputElement;
    const prefix = this.destinatarioPrefijo();
    const previousSuffix = this.destinatariosCampo().slice(prefix.length);
    let value = input.value;
    let cursor = input.selectionStart ?? value.length;

    if (prefix) {
      if (value.length < prefix.length || !value.startsWith(prefix)) {
        value = prefix + previousSuffix;
        cursor = Math.max(prefix.length, cursor);
      }
    }

    this.destinatariosCampo.set(value);
    if (input.value !== value) {
      input.value = value;
      const safeCursor = Math.min(Math.max(cursor, prefix.length), value.length);
      input.setSelectionRange(safeCursor, safeCursor);
    }
  }

  private destinatarioPrefijo(): string {
    const primary = this.destinatario().trim();
    return primary ? `${primary}, ` : '';
  }

  private parseDestinatariosExtra(): string[] {
    const prefix = this.destinatarioPrefijo();
    const raw = this.destinatariosCampo().slice(prefix.length).trim();
    if (!raw) return [];
    return raw.split(',').map((part) => part.trim()).filter(Boolean);
  }

  private validarDestinatariosExtra(): string | null {
    const extras = this.parseDestinatariosExtra();
    if (extras.length > MAX_EXTRA_RECIPIENTS) {
      return `Máximo ${MAX_EXTRA_RECIPIENTS} correos adicionales.`;
    }
    const principal = this.destinatario().trim().toLowerCase();
    const seen = new Set<string>();
    for (const email of extras) {
      if (!this.esEmailValido(email)) {
        return `Correo inválido: ${email}`;
      }
      const key = email.toLowerCase();
      if (key === principal) {
        return 'No repita el destinatario principal.';
      }
      if (seen.has(key)) {
        return `Correo duplicado: ${email}`;
      }
      seen.add(key);
    }
    return null;
  }

  private esEmailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async enviarCorreo(): Promise<void> {
    this.sendError.set(null);
    this.sendSuccess.set(null);
    this.destinatarioExtraError.set(null);
    const extraError = this.validarDestinatariosExtra();
    if (extraError) {
      this.destinatarioExtraError.set(extraError);
      return;
    }
    if (!this.puedeEnviar()) {
      this.sendError.set('No se puede enviar: falta correo de cobro de la propiedad o saldo pendiente.');
      return;
    }
    this.sending.set(true);
    try {
      const extras = this.parseDestinatariosExtra();
      const result = await this.data.sendPaymentReminderEmail(this.propiedad().id, {
        subject: this.asunto().trim(),
        extra_recipients: extras.length ? extras : undefined,
        body_html: this.generarHtml(),
        body_text: this.cuerpoTexto(),
        attachments: this.adjuntosPayload(),
      });
      if (result.status === 'sent') {
        this.sendSuccess.set(`Correo enviado a ${result.cliente_email}.`);
        this.sent.emit();
        return;
      }
      this.sendError.set(result.error_message ?? 'El servidor no confirmó el envío del correo.');
    } catch (error) {
      this.sendError.set(this.extractErrorMessage(error));
    } finally {
      this.sending.set(false);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: unknown } | null;
      if (typeof body?.message === 'string' && body.message.trim()) return body.message;
      if (error.status === 403) return 'No tienes permisos para enviar recordatorios (se requiere rol admin).';
      if (error.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
    }
    return 'No se pudo enviar el correo. Intenta de nuevo.';
  }

  private legalBodyContext(): LegalReminderBodyContext {
    const p = this.propiedad();
    return {
      tipoUnidad: this.data.tipoPropiedadLabels[p.tipo_propiedad] ?? 'UNIDAD',
      identificador: p.identificador,
      copropiedad: this.nombreCopropiedad(),
      montoPendiente: this.montoPendiente(),
    };
  }

  private cuerpoParrafosPlain(): string[] {
    const custom = this.cuerpoPersonalizado().trim();
    if (!custom) return [];
    return buildCustomReminderBodyPlain(custom);
  }

  private cuerpoParrafosHtml(): string {
    const custom = this.cuerpoPersonalizado().trim();
    if (!custom) return '';
    const escape = (v: string) => this.escapeHtmlLite(v);
    return buildCustomReminderBodyHtml(custom, escape, this.legalBodyContext());
  }

  parrafoPreviewHtml(text: string): SafeHtml {
    const inner = formatLegalParagraphInnerHtml(text, (v) => this.escapeHtmlLite(v), this.legalBodyContext());
    return this.sanitizer.bypassSecurityTrustHtml(inner);
  }

  private cuerpoTexto(): string {
    const parrafos = this.cuerpoParrafosPlain();
    const bloques = [
      `Estimado(a) ${this.nombreDestinatario()},`,
      ...(parrafos.length ? ['', ...parrafos, ''] : ['']),
      'Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo.',
      TEXTO_INQUIETUDES,
      '',
      'Cordialmente,',
      'Departamento de Cartera',
      'LegalTech',
    ];
    return bloques.join('\n');
  }

  async onAdjuntosSeleccionados(event: Event): Promise<void> {
    this.adjuntoError.set(null);
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    const actuales = [...this.adjuntos()];
    let totalBytes = actuales.reduce((sum, a) => sum + a.sizeBytes, 0);

    for (const file of Array.from(files)) {
      if (actuales.length >= MAX_ATTACHMENTS) {
        this.adjuntoError.set(`Máximo ${MAX_ATTACHMENTS} archivos por correo.`);
        break;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        this.adjuntoError.set(`"${file.name}" supera 5 MB.`);
        continue;
      }
      if (totalBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        this.adjuntoError.set('El total de adjuntos supera 15 MB.');
        break;
      }
      if (actuales.some((a) => a.filename === file.name && a.sizeBytes === file.size)) {
        continue;
      }
      try {
        const content_base64 = await this.readFileAsBase64(file);
        actuales.push({
          id: crypto.randomUUID(),
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          content_base64,
        });
        totalBytes += file.size;
      } catch {
        this.adjuntoError.set(`No se pudo leer "${file.name}".`);
      }
    }

    this.adjuntos.set(actuales);
    input.value = '';
  }

  quitarAdjunto(id: string): void {
    this.adjuntos.update((items) => items.filter((a) => a.id !== id));
    this.adjuntoError.set(null);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private adjuntosPayload(): PaymentReminderEmailAttachmentPayload[] {
    return this.adjuntos().map((a) => ({
      filename: a.filename,
      content_base64: a.content_base64,
      mime_type: a.mime_type,
    }));
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('invalid'));
          return;
        }
        const base64 = result.includes(',') ? result.split(',')[1]! : result;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }

  copiarTexto(): void {
    const text = this.cuerpoTexto();
    navigator.clipboard?.writeText(text);
  }

  copiarHtml(): void {
    const html = this.generarHtml();
    navigator.clipboard?.writeText(html);
  }

  private generarHtml(): string {
    const p = this.propiedad();
    const cliente = this.escapeHtmlLite(this.nombreDestinatario());
    const identificador = this.escapeHtmlLite(p.identificador);
    const fecha = this.escapeHtmlLite(this.fecha);
    const cuerpoHtml = this.cuerpoParrafosHtml();
    const inquietudesHtml = this.buildInquietudesHtml();
    const logoCid = `cid:${REMINDER_EMAIL_CID.logo}`;
    const header = this.buildEmailHeaderHtml(logoCid, fecha);
    const footer = this.buildFooterHtmlSnippet(logoCid);

    return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Recordatorio de pago - ${identificador}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#ececec;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ececec" style="background-color:#ececec;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:16px 8px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border-collapse:collapse;border:1px solid #dddddd;">
          <tr><td>${header}</td></tr>
          <tr>
            <td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#333333;">
              <p style="margin:0 0 8px;font-size:15px;color:#333333;text-align:justify;">Estimado(a) <strong>${cliente}</strong>,</p>
              ${cuerpoHtml}
              <p style="margin:0 0 8px;font-size:14px;color:#666666;text-align:justify;">Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo.</p>
              <p style="margin:0 0 12px;font-size:14px;color:#666666;text-align:justify;">${inquietudesHtml}</p>
              <p style="margin:0;font-size:15px;color:#333333;">Cordialmente,<br><strong>Departamento de Cartera</strong><br>LegalTech</p>
            </td>
          </tr>
          <tr><td>${footer}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildEmailHeaderHtml(logoCid: string, fecha: string): string {
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td style="background:#611374;padding:24px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td valign="middle" width="58" style="padding-right:14px;">
                <img src="${logoCid}" alt="LegalTech" width="48" height="48" style="display:block;width:48px;height:48px;border:0;border-radius:10px;" />
              </td>
              <td valign="middle">
                <p style="margin:0;font-size:20px;line-height:1.2;font-weight:700;color:#ffffff;font-family:Segoe UI,Helvetica,Arial,sans-serif;">LegalTech</p>
                <p style="margin:5px 0 0;font-size:12px;line-height:1.4;color:rgba(255,255,255,0.9);font-family:Segoe UI,Helvetica,Arial,sans-serif;">Departamento de Cartera</p>
              </td>
              <td valign="middle" align="right">
                <p style="margin:0;font-size:13px;line-height:1.4;color:rgba(255,255,255,0.95);font-family:Segoe UI,Helvetica,Arial,sans-serif;">${fecha}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  private buildInquietudesHtml(): string {
    const phone = `<a href="tel:${REMINDER_CONTACT.phoneTel}" style="color:#611374;text-decoration:underline;">${REMINDER_CONTACT.phoneDisplay}</a>`;
    const emailLinks = REMINDER_CONTACT.emails
      .map(
        (email) =>
          `<a href="mailto:${email}" style="color:#611374;text-decoration:underline;">${this.escapeHtmlLite(email)}</a>`,
      )
      .join(' y ');
    return `Cualquier inquietud al respecto será atendida en el teléfono ${phone} y los correos: ${emailLinks}.`;
  }

  private buildFooterHtmlSnippet(logoCid: string): string {
    const phoneIcon = `cid:${REMINDER_EMAIL_CID.phone}`;
    const emailIcon = `cid:${REMINDER_EMAIL_CID.email}`;
    const instagramIcon = `cid:${REMINDER_EMAIL_CID.instagram}`;
    const emailRows = REMINDER_CONTACT.emails
      .map(
        (email) =>
          `<p style="margin:0 0 6px;font-size:12px;font-style:italic;color:#fff;">
                  <img src="${emailIcon}" width="18" height="18" style="vertical-align:middle;margin-right:6px;border:0;" />
                  <a href="mailto:${email}" style="color:#fff;text-decoration:none;">${email}</a>
                </p>`,
      )
      .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td style="background:#611374;padding:18px 12px 10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td width="78" valign="middle" align="center" style="padding:8px 12px;">
                <a href="https://abogadosdigitales.com.co/" style="text-decoration:none;">
                  <img src="${logoCid}" alt="LegalTech" width="56" height="56" style="display:block;width:56px;height:56px;border:0;" />
                </a>
              </td>
              <td valign="middle" style="padding:8px 16px;border-left:1px solid #b884ca;">
                <a href="https://abogadosdigitales.com.co/" style="text-decoration:none;color:#fff;">
                  <p style="margin:0;font-size:15px;font-weight:700;letter-spacing:0.04em;color:#fff;">LEGALTECH</p>
                  <p style="margin:3px 0 0;font-size:10px;letter-spacing:0.1em;color:#fff;">ABOGADOS DIGITALES</p>
                </a>
                <p style="margin:6px 0 0;font-size:11px;"><a href="https://abogadosdigitales.com.co/" style="color:#eeacff;text-decoration:underline;">abogadosdigitales.com.co</a></p>
              </td>
              <td valign="middle" style="padding:8px 16px;border-left:1px solid #b884ca;">
                <p style="margin:0 0 6px;font-size:12px;font-style:italic;color:#fff;">
                  <img src="${phoneIcon}" width="18" height="18" style="vertical-align:middle;margin-right:6px;border:0;" />
                  <a href="tel:${REMINDER_CONTACT.phoneTel}" style="color:#fff;text-decoration:none;">${REMINDER_CONTACT.phoneDisplay}</a>
                </p>
                ${emailRows}
              </td>
              <td width="92" valign="middle" align="center" style="padding:8px 12px;border-left:1px solid #b884ca;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#fff;">SÍGUENOS</p>
                <a href="${INSTAGRAM_URL}" style="text-decoration:none;">
                  <img src="${instagramIcon}" alt="Instagram" width="28" height="28" style="display:block;margin:0 auto;border:0;" />
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="background:#611374;padding:0 16px 14px;">
          <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.9);">© ${this.footerYear} LegalTech | Todos los derechos reservados.</p>
        </td>
      </tr>
    </table>`;
  }

  iconUrl(filename: string): string {
    if (typeof globalThis.location !== 'undefined' && globalThis.location.origin) {
      return `${globalThis.location.origin}/brand/${filename}`;
    }
    return `/brand/${filename}`;
  }

  private escapeHtmlLite(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

}
