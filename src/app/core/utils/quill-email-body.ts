const P_STYLE =
  'margin:0 0 8px;font-size:14px;line-height:1.45;color:#333333;text-align:justify;font-family:Arial,Helvetica,sans-serif;';

/** Quill vacío típico. */
export function isEmptyQuillHtml(html: string): boolean {
  const trimmed = html.trim();
  if (!trimmed) return true;
  const plain = trimmed
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
  return !plain;
}

/** Texto plano desde HTML del editor (para body_text / portapapeles). */
export function quillHtmlToPlainText(html: string): string {
  if (typeof document === 'undefined') {
    return html
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.innerText || div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Aplica estilos inline a HTML de Quill para clientes de correo.
 * Solo reescribe etiquetas comunes del editor; no ejecuta scripts.
 */
export function styleQuillHtmlForEmail(html: string): string {
  if (isEmptyQuillHtml(html)) return '';
  let out = html.trim();
  out = out.replace(/<p(\s[^>]*)?>/gi, `<p style="${P_STYLE}">`);
  out = out.replace(/<li(\s[^>]*)?>/gi, '<li style="margin:0 0 4px;color:#333333;">');
  out = out.replace(
    /<ul(\s[^>]*)?>/gi,
    '<ul style="margin:0 0 8px;padding-left:1.25rem;color:#333333;">',
  );
  out = out.replace(
    /<ol(\s[^>]*)?>/gi,
    '<ol style="margin:0 0 8px;padding-left:1.25rem;color:#333333;">',
  );
  return out;
}
