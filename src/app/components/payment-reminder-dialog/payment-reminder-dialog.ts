import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import type { Propiedad } from '../../core/models';

@Component({
  selector: 'app-payment-reminder-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" (click)="openChange.emit(false)"></div>
      <div class="relative z-50 bg-card rounded-2xl shadow-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-auto">
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
          <!-- Destinatario y Asunto (según datos del cliente/propiedad) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Destinatario</label>
              <input
                type="email"
                [value]="destinatario()"
                readonly
                class="w-full rounded-xl border border-input bg-muted/50 px-4 py-2.5 text-sm text-foreground"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Asunto</label>
              <input
                type="text"
                [value]="asunto()"
                readonly
                class="w-full rounded-xl border border-input bg-muted/50 px-4 py-2.5 text-sm text-foreground"
              />
            </div>
          </div>

          <!-- Vista previa de la plantilla (no editable) -->
          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Vista previa del correo electrónico</h3>
            <div class="rounded-xl border border-border overflow-hidden bg-background shadow-sm">
              <!-- Cabecera del email -->
              <div class="bg-primary text-primary-foreground px-6 py-4 flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20 text-primary-foreground font-bold text-lg">L</span>
                  <span class="font-display font-bold text-lg">LegalTech</span>
                </div>
                <span class="ml-auto text-sm opacity-90 font-medium">{{ fecha }}</span>
              </div>
              <div class="px-6 py-5 text-sm space-y-4">
                <p class="text-foreground font-medium">Estimado(a) {{ clienteNombre() }},</p>
                <p class="text-muted-foreground leading-relaxed">
                  Por medio de la presente nos permitimos recordarle que a la fecha presenta un <strong class="text-foreground">saldo pendiente de pago</strong> correspondiente a la propiedad indicada a continuación.
                </p>
                <div class="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p class="text-foreground font-semibold">Propiedad: {{ propiedad().identificador }}</p>
                  <p class="text-muted-foreground">Dirección: {{ propiedad().direccion }}</p>
                </div>
                <div class="rounded-xl border-2 border-primary bg-primary/10 p-4 space-y-1">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Monto pendiente</p>
                  <p class="text-xl font-bold text-primary">{{ data.formatCurrency(montoPendiente()) }}</p>
                  <p class="text-xs text-muted-foreground">Fecha de corte: {{ fecha }}</p>
                </div>
                <p class="text-muted-foreground leading-relaxed">
                  Le solicitamos amablemente realizar el pago a la mayor brevedad posible para evitar la generación de intereses de mora y/o el inicio de acciones de cobro adicionales.
                </p>
                <p class="text-muted-foreground leading-relaxed text-xs">
                  Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo. Para cualquier consulta o acuerdo de pago, no dude en comunicarse con nosotros.
                </p>
                <div class="pt-4 border-t border-border">
                  <p class="font-semibold text-foreground">Cordialmente,</p>
                  <p class="text-muted-foreground">Departamento de Cartera</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Datos de la propiedad -->
          <div class="rounded-xl bg-muted/50 p-4">
            <h3 class="text-sm font-semibold text-foreground mb-3">DATOS DE LA PROPIEDAD</h3>
            <p class="font-medium text-foreground">Propiedad: {{ propiedad().identificador }}</p>
            <p class="font-medium text-foreground">Dirección: {{ propiedad().direccion }}</p>
            <p class="font-medium text-foreground">Cliente: {{ clienteNombre() }}</p>
          </div>

          <!-- Mensaje automático -->
          <div class="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Este es un mensaje automático del sistema de gestión de cartera. Si tiene alguna consulta, comuníquese con el Departamento de Cartera.
          </div>

          <!-- Resumen -->
          <div class="rounded-xl bg-muted/50 p-4">
            <h3 class="text-sm font-semibold text-foreground mb-3">Resumen</h3>
            <p class="text-sm text-foreground">Cliente: {{ clienteNombre() }} - {{ destinatario() }}</p>
            <p class="text-sm text-foreground">Propiedad: {{ propiedad().identificador }}</p>
            <p class="text-sm font-bold text-destructive mt-2">Monto pendiente: {{ data.formatCurrency(montoPendiente()) }}</p>
          </div>

          <!-- Acciones -->
          <div class="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              (click)="copiarTexto()"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              Copiar Texto
            </button>
            <button
              type="button"
              (click)="copiarHtml()"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              Copiar HTML
            </button>
            <a
              [href]="mailtoLink()"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9 22 2z"/></svg>
              Abrir en Correo
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PaymentReminderDialog {
  open = input<boolean>(true);
  propiedad = input.required<Propiedad>();
  openChange = output<boolean>();

  destinatario = signal('');
  asunto = signal('');

  fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  clienteNombre = computed(() => {
    const cl = this.data.getClienteById(this.propiedad().cliente_id);
    return cl?.nombre ?? '';
  });
  montoPendiente = computed(() => {
    const hist = this.data.getHistorialByPropiedad(this.propiedad().id);
    const cobrado = hist.reduce((s, h) => s + h.valor_cobrado, 0);
    const pagado = hist.reduce((s, h) => s + h.valor_pagado, 0);
    return cobrado - pagado;
  });

  constructor(protected data: DataService) {
    effect(() => {
      const p = this.propiedad();
      const cl = this.data.getClienteById(p.cliente_id);
      this.destinatario.set(cl?.email ?? '');
      this.asunto.set(`Recordatorio de pago - ${p.identificador}`);
    });
  }

  mailtoLink(): string {
    const body = this.cuerpoTexto();
    return `mailto:${encodeURIComponent(this.destinatario())}?subject=${encodeURIComponent(this.asunto())}&body=${encodeURIComponent(body)}`;
  }

  private cuerpoTexto(): string {
    const p = this.propiedad();
    return [
      `Estimado(a) ${this.clienteNombre()},`,
      '',
      `Por medio de la presente nos permitimos recordarle que a la fecha presenta un saldo pendiente de pago correspondiente a la propiedad ${p.identificador} ubicada en ${p.direccion}.`,
      '',
      `Monto pendiente: ${this.data.formatCurrency(this.montoPendiente())}`,
      `Fecha de corte: ${this.fecha}`,
      '',
      'Le solicitamos amablemente realizar el pago a la mayor brevedad posible para evitar la generación de intereses de mora y/o el inicio de acciones de cobro adicionales.',
      '',
      'Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo.',
      'Para cualquier consulta o acuerdo de pago, no dude en comunicarse con nosotros.',
      '',
      'Cordialmente, Departamento de Cartera',
    ].join('\n');
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
    const monto = this.data.formatCurrency(this.montoPendiente());
    const cliente = this.clienteNombre();
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de pago - ${p.identificador}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:1.5;color:#374151;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;box-shadow:0 4px 6px rgba(0,0,0,0.05);border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6b3cc8 0%,#9333ea 100%);color:#ffffff;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:12px;font-weight:700;font-size:18px;">L</span>
        <span style="font-weight:700;font-size:18px;">LegalTech</span>
      </div>
      <span style="font-size:13px;opacity:0.95;">${this.fecha}</span>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 16px;font-weight:500;color:#111827;">Estimado(a) ${cliente},</p>
      <p style="margin:0 0 20px;color:#6b7280;line-height:1.6;">Por medio de la presente nos permitimos recordarle que a la fecha presenta un <strong style="color:#111827;">saldo pendiente de pago</strong> correspondiente a la propiedad indicada a continuación.</p>
      <div style="margin:0 0 20px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
        <p style="margin:0 0 6px;font-weight:600;color:#111827;">Propiedad: ${p.identificador}</p>
        <p style="margin:0;font-size:14px;color:#6b7280;">Dirección: ${p.direccion}</p>
      </div>
      <div style="margin:0 0 24px;padding:20px;background:rgba(107,60,200,0.08);border:2px solid rgba(107,60,200,0.4);border-radius:12px;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;color:#6b7280;">Monto pendiente</p>
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#6b3cc8;">${monto}</p>
        <p style="margin:0;font-size:12px;color:#6b7280;">Fecha de corte: ${this.fecha}</p>
      </div>
      <p style="margin:0 0 16px;color:#6b7280;line-height:1.6;">Le solicitamos amablemente realizar el pago a la mayor brevedad posible para evitar la generación de intereses de mora y/o el inicio de acciones de cobro adicionales.</p>
      <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;line-height:1.6;">Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo. Para cualquier consulta o acuerdo de pago, no dude en comunicarse con nosotros.</p>
      <div style="padding-top:20px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-weight:600;color:#111827;">Cordialmente,</p>
        <p style="margin:0;color:#6b7280;">Departamento de Cartera</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
