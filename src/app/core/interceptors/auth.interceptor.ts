import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { SKIP_AUTH } from './auth-context';

function withAuthHeader(req: HttpRequest<unknown>, accessToken: string | null): HttpRequest<unknown> {
  if (!accessToken) return req;
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  if (req.context.get(SKIP_AUTH)) {
    console.log('[LegalDebug][Http] SKIP_AUTH', req.method, req.url);
    return next(req);
  }

  const tokenStorage = inject(TokenStorageService);
  const auth = inject(AuthService);

  const accessToken = tokenStorage.getAccessToken();
  const requestWithAuth = withAuthHeader(req, accessToken);

  console.log('[LegalDebug][Http] outgoing', {
    method: req.method,
    url: req.url,
    hasAuthorizationHeader: !!accessToken,
  });

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || req.url.includes('/auth/')) {
        if (error instanceof HttpErrorResponse) {
          console.error('[LegalDebug][Http] error response', {
            method: req.method,
            url: req.url,
            status: error.status,
            statusText: error.statusText,
            body: error.error,
          });
        } else {
          console.error('[LegalDebug][Http] error (non-HttpErrorResponse)', error);
        }
        return throwError(() => error);
      }

      console.warn('[LegalDebug][Http] 401 -> intentando refresh', req.method, req.url);

      return from(auth.refreshSession()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            return throwError(() => error);
          }
          const retried = withAuthHeader(req, tokenStorage.getAccessToken());
          return next(retried);
        }),
        catchError((refreshError: unknown) => throwError(() => refreshError))
      );
    })
  );
};
