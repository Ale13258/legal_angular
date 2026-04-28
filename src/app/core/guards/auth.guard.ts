import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ok = await auth.ensureSession();
  if (ok) {
    return true;
  }
  return router.createUrlTree(['/'], {
    queryParams: { returnUrl: router.url },
  });
};
