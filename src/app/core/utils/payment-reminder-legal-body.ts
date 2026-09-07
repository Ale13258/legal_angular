import { formatMontoLegalColombiano, montoEnLetrasPesos } from './monto-en-letras';

export const DEFAULT_REMINDER_SUBJECT = 'RECORDATORIO DE PAGO OBLIGACIONES EN MORA';

export const REMINDER_LETTER_BODY_ID = 'reminder-letter-body';

export type LegalReminderBodyContext = {
  identificador: string;
  montoPendiente: number;
  phoneDisplay: string;
  emails: readonly string[];
};

export type PaymentReminderComposeDraft = {
  subject: string;
  cuerpoHtml: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function montoLegalTexto(montoPendiente: number): string {
  return `${montoEnLetrasPesos(montoPendiente)} (${formatMontoLegalColombiano(montoPendiente)})`;
}

function correosTexto(emails: readonly string[]): string {
  if (emails.length === 0) return '';
  if (emails.length === 1) return emails[0]!;
  return `${emails.slice(0, -1).join(', ')} y ${emails[emails.length - 1]}`;
}

function inquietudesTexto(ctx: LegalReminderBodyContext): string {
  return `Cualquier inquietud al respecto será atendida en el teléfono ${ctx.phoneDisplay} y los correos: ${correosTexto(ctx.emails)}.`;
}

export function splitCustomBodyParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildLegalReminderBodyPlain(ctx: LegalReminderBodyContext): string[] {
  const propiedad = ctx.identificador.trim() || '—';
  const monto = montoLegalTexto(ctx.montoPendiente);

  return [
    'Respetados Señores:',
    `De acuerdo con el estado de cuenta anexo, la propiedad ${propiedad}, se encuentra en mora en el pago de gastos comunes de administración, lo cual genera intereses moratorios de acuerdo con lo establecido en la Ley 675 de 2001.`,
    'Es importante mencionar que el pago puntual de las cuotas de administración es fundamental para el correcto funcionamiento del edificio, ya que permite cubrir los gastos relacionados con el mantenimiento de las zonas comunes, la prestación de servicios públicos y la seguridad de la copropiedad, motivo por el que la administración solicitó a nuestra firma el inicio de las acciones legales para obtener el pronto pago de las obligaciones en mora.',
    `Sin embargo, antes de iniciar el proceso judicial, solicitamos realizar el pago de la deuda pendiente, que, conforme al estado de cuenta anexo, adeuda la suma ${monto} más el 10% por concepto de honorarios profesionales de abogado generados por la gestión de cobro pre jurídico.`,
    'Recuerde que de no ser posible el pago total de la deuda, usted puede suscribir un acuerdo de pago con el fin de no seguir acumulando intereses y prevenir futuros cobros por vía judicial, puede responder a este correo con una oferta según su capacidad de pago para ser revisada junto con la administración.',
    'Agradecemos su atención a esta solicitud y esperamos contar con su pronta respuesta.',
    'Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo.',
    inquietudesTexto(ctx),
    'Cordialmente,\nDepartamento de Cartera\nLegalTech',
  ];
}

/** HTML de párrafos para precargar Quill (sin envoltorio de marca). */
export function buildLegalReminderBodyHtml(ctx: LegalReminderBodyContext): string {
  const propiedad = escapeHtml(ctx.identificador.trim() || '—');
  const monto = escapeHtml(montoLegalTexto(ctx.montoPendiente));
  const inquietudes = escapeHtml(inquietudesTexto(ctx));

  return [
    '<p>Respetados Señores:</p>',
    `<p>De acuerdo con el estado de cuenta anexo, la propiedad ${propiedad}, se encuentra en mora en el pago de gastos comunes de administración, lo cual genera intereses moratorios de acuerdo con lo establecido en la Ley 675 de 2001.</p>`,
    '<p>Es importante mencionar que el pago puntual de las cuotas de administración es fundamental para el correcto funcionamiento del edificio, ya que permite cubrir los gastos relacionados con el mantenimiento de las zonas comunes, la prestación de servicios públicos y la seguridad de la copropiedad, motivo por el que la administración solicitó a nuestra firma el inicio de las acciones legales para obtener el pronto pago de las obligaciones en mora.</p>',
    `<p>Sin embargo, antes de iniciar el proceso judicial, solicitamos realizar el pago de la deuda pendiente, que, conforme al estado de cuenta anexo, adeuda la suma ${monto} más el 10% por concepto de honorarios profesionales de abogado generados por la gestión de cobro pre jurídico.</p>`,
    '<p>Recuerde que de no ser posible el pago total de la deuda, usted puede suscribir un acuerdo de pago con el fin de no seguir acumulando intereses y prevenir futuros cobros por vía judicial, puede responder a este correo con una oferta según su capacidad de pago para ser revisada junto con la administración.</p>',
    '<p>Agradecemos su atención a esta solicitud y esperamos contar con su pronta respuesta.</p>',
    '<p>Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo.</p>',
    `<p>${inquietudes}</p>`,
    '<p>Cordialmente,<br>Departamento de Cartera<br>LegalTech</p>',
  ].join('');
}

/** Extrae la carta editable del HTML enviado (marcador) o del texto plano histórico. */
export function extractReminderLetterHtml(bodyHtml?: string | null, bodyText?: string | null): string {
  const html = bodyHtml?.trim() ?? '';
  if (html) {
    const re = new RegExp(
      `<div[^>]*\\bid=["']${REMINDER_LETTER_BODY_ID}["'][^>]*>([\\s\\S]*?)</div>`,
      'i',
    );
    const marked = html.match(re);
    if (marked?.[1]?.trim()) return marked[1].trim();
  }

  const text = bodyText?.trim() ?? '';
  if (!text) return '';
  return splitCustomBodyParagraphs(text)
    .map((part) => `<p>${escapeHtml(part).replaceAll('\n', '<br>')}</p>`)
    .join('');
}
