import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();

  // Solo para endpoints admin
  const isAdminApi = req.url.startsWith('/api/admin');

  const authReq =
    token && isAdminApi
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (
        isAdminApi &&
        err instanceof HttpErrorResponse &&
        (err.status === 401 || err.status === 403)
      ) {
        auth.logout(); // borra token
        if (!router.url.startsWith('/panel-gestion/login')) {
          router.navigateByUrl('/panel-gestion/login');
        }
      }
      return throwError(() => err);
    })
  );
};
