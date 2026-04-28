import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Evita que usuarios logueados vean login/registro de nuevo */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ok = await auth.ensureSession();
  if (ok) {
    return router.createUrlTree([auth.defaultRouteAfterLogin()]);
  }
  return true;
};
