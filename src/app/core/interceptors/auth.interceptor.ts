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
    return next(req);
  }

  const tokenStorage = inject(TokenStorageService);
  const auth = inject(AuthService);

  const accessToken = tokenStorage.getAccessToken();
  const requestWithAuth = withAuthHeader(req, accessToken);

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || req.url.includes('/auth/')) {
        return throwError(() => error);
      }

      return from(auth.refreshSession()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            void auth.logoutAndRedirect();
            return throwError(() => error);
          }
          const retried = withAuthHeader(req, tokenStorage.getAccessToken());
          return next(retried);
        }),
        catchError((refreshError: unknown) => {
          void auth.logoutAndRedirect();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
