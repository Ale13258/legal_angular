import { HttpErrorResponse } from '@angular/common/http';

export function mapCuentaSaveError(error: unknown, mode: 'create' | 'edit'): string {
  const generic =
    mode === 'edit'
      ? 'No se pudo editar la propiedad. Verifica los datos e intenta nuevamente.'
      : 'No se pudo crear la propiedad. Verifica los datos e intenta nuevamente.';

  if (!(error instanceof HttpErrorResponse)) {
    return generic;
  }

  const fromApi = extractBackendMessage(error.error);

  if (error.status === 409) {
    return (
      fromApi ||
      'Esos datos ya están en uso. Si acabas de borrar la propiedad, recarga e inténtalo de nuevo.'
    );
  }

  if (error.status === 400) {
    if (typeof fromApi === 'string' && fromApi.includes('saldo_inicial')) {
      return 'No se pudo crear la cuenta porque el backend no reconoce el campo "saldo_inicial".';
    }
    return fromApi || 'Revisa los datos de la propiedad y de cada deudor.';
  }

  if (error.status === 404) {
    return 'No se encontró el cliente o la propiedad.';
  }

  return generic;
}

function extractBackendMessage(errorBody: unknown): string {
  if (!errorBody || typeof errorBody !== 'object') return '';
  const candidate = errorBody as { message?: unknown; error?: unknown };
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }
  if (Array.isArray(candidate.message) && typeof candidate.message[0] === 'string') {
    return candidate.message[0];
  }
  if (typeof candidate.error === 'string' && candidate.error.trim()) {
    return candidate.error;
  }
  return '';
}
