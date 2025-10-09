import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if(token){
    const clone: HttpRequest<unknown> = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    return next(clone);
  }
  return next(req);
};
