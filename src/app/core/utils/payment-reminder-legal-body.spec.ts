import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_SUBJECT,
  REMINDER_LETTER_BODY_ID,
  buildLegalReminderBodyHtml,
  buildLegalReminderBodyPlain,
  extractReminderLetterHtml,
} from './payment-reminder-legal-body';

const ctx = {
  identificador: 'APT-101',
  montoPendiente: 9444787,
  phoneDisplay: '+573027636712',
  emails: ['analistalegal@abogadosdigitales.com.co', 'abogadojunior@abogadosdigitales.com.co'],
};

describe('payment-reminder-legal-body', () => {
  it('expone el asunto por defecto de la plantilla', () => {
    expect(DEFAULT_REMINDER_SUBJECT).toBe('RECORDATORIO DE PAGO OBLIGACIONES EN MORA');
  });

  it('construye la carta con propiedad, monto en letras y contacto', () => {
    const paragraphs = buildLegalReminderBodyPlain(ctx);
    expect(paragraphs[0]).toBe('Respetados Señores:');
    expect(paragraphs.some((p) => p.includes('la propiedad APT-101'))).toBe(true);
    expect(paragraphs.some((p) => p.includes('NUEVE MILLONES'))).toBe(true);
    expect(paragraphs.some((p) => p.includes('$9.444.787,oo'))).toBe(true);
    expect(paragraphs.some((p) => p.includes('más el 10%'))).toBe(true);
    expect(paragraphs.some((p) => p.includes(ctx.phoneDisplay))).toBe(true);
    expect(paragraphs.at(-1)).toContain('Departamento de Cartera');
  });

  it('genera HTML de párrafos para Quill sin envoltorio de marca', () => {
    const html = buildLegalReminderBodyHtml(ctx);
    expect(html).toContain('<p>Respetados Señores:</p>');
    expect(html).toContain('la propiedad APT-101');
    expect(html).not.toContain('cid:');
    expect(html).not.toContain(REMINDER_LETTER_BODY_ID);
  });

  it('extrae la carta del marcador en body_html', () => {
    const inner = '<p>Carta enviada</p>';
    const wrapped = `<html><body><div id="${REMINDER_LETTER_BODY_ID}">${inner}</div></body></html>`;
    expect(extractReminderLetterHtml(wrapped, 'texto plano ignorado')).toBe(inner);
  });

  it('cae a body_text cuando no hay marcador', () => {
    const html = '<html><body><p>Marca</p></body></html>';
    const extracted = extractReminderLetterHtml(html, 'Párrafo uno.\n\nPárrafo dos.');
    expect(extracted).toContain('<p>Párrafo uno.</p>');
    expect(extracted).toContain('<p>Párrafo dos.</p>');
  });
});
