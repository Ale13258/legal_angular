import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Solo super_admin puede gestionar usuarios staff. */
export const superAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ok = await auth.ensureSession();
  if (!ok) {
    return router.createUrlTree(['/']);
  }
  if (auth.isCliente()) {
    return router.createUrlTree(['/mi-cartera']);
  }
  if (!auth.isSuperAdmin()) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
