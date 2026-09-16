import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mapProcesoLegalSaveError } from './proceso-legal-save-error';

function httpError(status: number, body?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('mapProcesoLegalSaveError', () => {
  it('muestra el 409 del API al recrear un número duplicado', () => {
    const error = httpError(409, { code: 'CONFLICT', message: 'Ya existe un radicado con ese número' });
    expect(mapProcesoLegalSaveError(error, 'create')).toBe('Ya existe un radicado con ese número');
  });

  it('cae a texto de duplicado si el 409 no trae mensaje', () => {
    expect(mapProcesoLegalSaveError(httpError(409, {}), 'create')).toBe(
      'Ya existe un radicado con ese número.',
    );
  });

  it('distingue payload inválido de error genérico', () => {
    expect(mapProcesoLegalSaveError(httpError(400, { message: 'Payload invalido' }), 'create')).toBe(
      'Revisa los datos: el número y la cuenta son obligatorios.',
    );
    expect(mapProcesoLegalSaveError(httpError(500), 'create')).toBe(
      'No se pudo crear el radicado. Revisa los datos o el servidor e intenta de nuevo.',
    );
    expect(mapProcesoLegalSaveError(httpError(500), 'edit')).toBe(
      'No se pudo editar el radicado. Revisa los datos o el servidor e intenta de nuevo.',
    );
  });
});
