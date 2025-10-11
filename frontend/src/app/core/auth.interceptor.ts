import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const lang =
    (typeof localStorage !== 'undefined' && localStorage.getItem('ema_lang')) ||
    (typeof document !== 'undefined' && document.documentElement.getAttribute('lang')) ||
    'en';
  const headers: Record<string, string> = { 'Accept-Language': lang };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const clone: HttpRequest<unknown> = req.clone({ setHeaders: headers });
  return next(clone);
};
