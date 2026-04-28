import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ok = await auth.ensureSession();
  if (!ok) {
    return router.createUrlTree(['/']);
  }
  if (auth.isCliente()) {
    return router.createUrlTree(['/mi-cartera']);
  }
  return true;
};
