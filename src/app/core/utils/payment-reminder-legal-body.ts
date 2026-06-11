import { formatMontoLegalColombiano, montoEnLetrasPesos } from './monto-en-letras';

export type LegalReminderBodyContext = {
  tipoUnidad: string;
  identificador: string;
  copropiedad: string;
  montoPendiente: number;
};

const P_STYLE =
  'margin:0 0 8px;font-size:14px;line-height:1.45;color:#333333;text-align:justify;font-family:Arial,Helvetica,sans-serif;';

const STATIC_BOLD_PHRASES = [
  'Ley 675 de 2001',
  'inicio de las acciones legales',
  'pronto pago',
  'honorarios profesionales de abogado',
  'cobro pre-jurídico',
  'acuerdo de pago',
  'inicio del cobro por vía judicial',
  'cobro por vía judicial',
  'honorarios por gestión',
  '10%',
];

function montoLegalTexto(ctx: LegalReminderBodyContext): string {
  return `${montoEnLetrasPesos(ctx.montoPendiente)} (${formatMontoLegalColombiano(ctx.montoPendiente)})`;
}

/** Envuelve el valor a cobrar en ** para negrita, tolerando saltos de línea en el texto pegado. */
function boldValorACobrarInPlainText(text: string, ctx: LegalReminderBodyContext): string {
  if (text.includes('**') && text.includes('PESOS MONEDA CORRIENTE')) return text;

  const monto = montoLegalTexto(ctx);
  const flexibleMonto = monto
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  const exactRe = new RegExp(flexibleMonto, 'i');
  if (exactRe.test(text)) {
    return text.replace(exactRe, (match) => `**${match.replace(/\s+/g, ' ').trim()}**`);
  }

  const numero = formatMontoLegalColombiano(ctx.montoPendiente).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bloqueRe = new RegExp(
    `([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\\s]*?PESOS\\s+MONEDA\\s+CORRIENTE\\s*\\(${numero}\\))`,
    'i',
  );
  if (bloqueRe.test(text)) {
    return text.replace(bloqueRe, (match) => `**${match.replace(/\s+/g, ' ').trim()}**`);
  }

  const entreMarcadores = /(corresponde a la suma de\s+)([\s\S]*?)(\s+más el)/i;
  if (entreMarcadores.test(text)) {
    return text.replace(entreMarcadores, (_full, ini, valor, fin) => {
      const limpio = String(valor).replace(/\s+/g, ' ').trim();
      return `${ini}**${limpio}**${fin}`;
    });
  }

  return text;
}

function convertMarkdownBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function wrapPhraseInStrong(html: string, phrase: string): string {
  if (html.includes(`<strong>${phrase}</strong>`)) return html;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(escaped, 'gi'), (match) => {
    return `<strong>${match}</strong>`;
  });
}

function applyStaticLegalBolds(html: string): string {
  let result = html;
  for (const phrase of STATIC_BOLD_PHRASES) {
    result = wrapPhraseInStrong(result, phrase);
  }
  return result;
}

function applyDynamicLegalBolds(html: string, ctx: LegalReminderBodyContext): string {
  const unidad = `${ctx.tipoUnidad} ${ctx.identificador}`.trim();
  let result = wrapPhraseInStrong(html, unidad);
  result = wrapPhraseInStrong(result, ctx.copropiedad);
  return result;
}

/** Aplica negritas legales y saltos de línea a un párrafo ya escapado para HTML. */
export function formatLegalParagraphInnerHtml(
  plainParagraph: string,
  escapeHtml: (value: string) => string,
  ctx?: LegalReminderBodyContext,
): string {
  let plain = plainParagraph;
  if (ctx) plain = boldValorACobrarInPlainText(plain, ctx);
  let inner = escapeHtml(plain).replaceAll('\n', '<br>');
  inner = convertMarkdownBold(inner);
  inner = applyStaticLegalBolds(inner);
  if (ctx) inner = applyDynamicLegalBolds(inner, ctx);
  return inner;
}

export function buildLegalReminderBodyPlain(ctx: LegalReminderBodyContext): string[] {
  const unidad = `${ctx.tipoUnidad} ${ctx.identificador}`.trim();
  const monto = montoLegalTexto(ctx);

  return [
    `De acuerdo con el estado de cuenta anexo, el ${unidad}, ubicado en la copropiedad ${ctx.copropiedad}, se encuentra en mora en el pago de gastos comunes de administración, lo cual genera intereses moratorios de acuerdo con lo establecido en la Ley 675 de 2001.`,
    'Es importante mencionar que el pago puntual de las cuotas de administración es fundamental para el correcto funcionamiento del edificio, ya que permite cubrir los gastos relacionados con el mantenimiento de las zonas comunes, la prestación de servicios públicos en aras comunes y la seguridad de la copropiedad, motivo por el que la administración solicitó a nuestra firma el inicio de las acciones legales para obtener el pronto pago de las obligaciones en mora.',
    `Sin embargo, antes de iniciar el proceso judicial, solicitamos realizar el pago de la obligación, que conforme al estado de cuenta anexo, corresponde a la suma de ${monto} más el 10% del saldo adeudado correspondiente a honorarios profesionales de abogado en consecuencia a la gestión de cobro pre-jurídico.`,
    'Recuerde que de no ser posible el pago total de la obligación, ustedes pueden suscribir un acuerdo de pago con el fin de no incrementar intereses y evitar el inicio del cobro por vía judicial.',
    'De no recibir respuesta a la presente comunicación, procederemos con el cobro por vía judicial, lo cual incrementa el porcentaje de honorarios por gestión.',
  ];
}

export function buildLegalReminderBodyHtml(
  ctx: LegalReminderBodyContext,
  escapeHtml: (value: string) => string,
): string {
  const unidad = escapeHtml(`${ctx.tipoUnidad} ${ctx.identificador}`.trim());
  const copropiedad = escapeHtml(ctx.copropiedad);
  const monto = escapeHtml(montoLegalTexto(ctx));

  return [
    `<p style="${P_STYLE}">De acuerdo con el estado de cuenta anexo, el <strong>${unidad}</strong>, ubicado en la copropiedad <strong>${copropiedad}</strong>, se encuentra en mora en el pago de gastos comunes de administración, lo cual genera intereses moratorios de acuerdo con lo establecido en la <strong>Ley 675 de 2001</strong>.</p>`,
    `<p style="${P_STYLE}">Es importante mencionar que el pago puntual de las cuotas de administración es fundamental para el correcto funcionamiento del edificio, ya que permite cubrir los gastos relacionados con el mantenimiento de las zonas comunes, la prestación de servicios públicos en aras comunes y la seguridad de la copropiedad, motivo por el que la administración solicitó a nuestra firma el <strong>inicio de las acciones legales</strong> para obtener el <strong>pronto pago</strong> de las obligaciones en mora.</p>`,
    `<p style="${P_STYLE}">Sin embargo, antes de iniciar el proceso judicial, solicitamos realizar el pago de la obligación, que conforme al estado de cuenta anexo, corresponde a la suma de <strong style="font-weight:700;">${monto}</strong> más el <strong>10%</strong> del saldo adeudado correspondiente a <strong>honorarios profesionales de abogado</strong> en consecuencia a la gestión de <strong>cobro pre-jurídico</strong>.</p>`,
    `<p style="${P_STYLE}">Recuerde que de no ser posible el pago total de la obligación, ustedes pueden suscribir un <strong>acuerdo de pago</strong> con el fin de no incrementar intereses y evitar el <strong>inicio del cobro por vía judicial</strong>.</p>`,
    `<p style="${P_STYLE}">De no recibir respuesta a la presente comunicación, procederemos con el <strong>cobro por vía judicial</strong>, lo cual incrementa el porcentaje de <strong>honorarios por gestión</strong>.</p>`,
  ].join('');
}

export function splitCustomBodyParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildCustomReminderBodyPlain(text: string): string[] {
  return splitCustomBodyParagraphs(text);
}

export function buildCustomReminderBodyHtml(
  text: string,
  escapeHtml: (value: string) => string,
  ctx?: LegalReminderBodyContext,
): string {
  return splitCustomBodyParagraphs(text)
    .map(
      (part) =>
        `<p style="${P_STYLE}">${formatLegalParagraphInnerHtml(part, escapeHtml, ctx)}</p>`,
    )
    .join('');
}
