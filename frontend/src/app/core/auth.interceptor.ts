import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Skip token refresh for auth endpoints to avoid infinite loops
  if (req.url.includes('/api/auth/refresh') || req.url.includes('/api/auth/login')) {
    return next(req);
  }

  const token = auth.getToken();
  const lang =
    (typeof localStorage !== 'undefined' && localStorage.getItem('ema_lang')) ||
    (typeof document !== 'undefined' && document.documentElement.getAttribute('lang')) ||
    'en';
  const headers: Record<string, string> = { 'Accept-Language': lang };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const clone: HttpRequest<unknown> = req.clone({ setHeaders: headers });

  return next(clone).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if error is 401 Unauthorized
      if (error.status === 401) {
        // Try to refresh the token
        return auth.refreshAccessToken().pipe(
          switchMap(response => {
            // Save the new tokens
            auth.saveLoginResponse(response);

            // Clone the original request with the new token
            const newHeaders = { ...headers };
            newHeaders['Authorization'] = `Bearer ${response.accessToken}`;
            const newReq = req.clone({ setHeaders: newHeaders });

            // Retry the request with the new token
            return next(newReq);
          }),
          catchError(refreshError => {
            // If refresh fails, log out the user
            auth.logout();
            return throwError(() => refreshError);
          })
        );
      }

      // If not 401 or refresh failed, just pass through the error
      return throwError(() => error);
    })
  );
};
