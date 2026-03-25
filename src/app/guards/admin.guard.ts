import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLogged()) {
    auth.logout(); // limpia token vencido/invalidado
    return router.createUrlTree(['/panel-gestion/login']);
  }

  return true;
};

export const adminChildGuard: CanActivateChildFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLogged()) {
    auth.logout(); // limpia token vencido/invalidado
    return router.createUrlTree(['/panel-gestion/login']);
  }

  return true;
};
