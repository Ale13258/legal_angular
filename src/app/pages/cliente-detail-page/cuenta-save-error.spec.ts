import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mapCuentaSaveError } from './cuenta-save-error';

function httpError(status: number, body?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('mapCuentaSaveError', () => {
  it('muestra el 409 del API al recrear datos que siguen ocupados', () => {
    const error = httpError(409, { code: 'CONFLICT', message: 'Conflicto por valor unico duplicado' });
    expect(mapCuentaSaveError(error, 'create')).toBe('Conflicto por valor unico duplicado');
  });

  it('cae a texto de conflicto si el 409 no trae mensaje', () => {
    expect(mapCuentaSaveError(httpError(409, {}), 'create')).toBe(
      'Esos datos ya están en uso. Si acabas de borrar la propiedad, recarga e inténtalo de nuevo.',
    );
  });

  it('muestra validación 400 y distingue el error genérico', () => {
    expect(mapCuentaSaveError(httpError(400, { message: 'documento duplicado en la misma unidad' }), 'create')).toBe(
      'documento duplicado en la misma unidad',
    );
    expect(mapCuentaSaveError(httpError(500), 'create')).toBe(
      'No se pudo crear la propiedad. Verifica los datos e intenta nuevamente.',
    );
    expect(mapCuentaSaveError(httpError(500), 'edit')).toBe(
      'No se pudo editar la propiedad. Verifica los datos e intenta nuevamente.',
    );
  });
});
