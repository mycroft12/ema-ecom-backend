import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required: string[] = route.data?.['permissions'] || [];

  return auth.ensureAuthenticated().pipe(
      map(isAuth => {
        if (!isAuth) {
          router.navigateByUrl('/login');
          return false;
        }

        if (required.length === 0) {
          return true;
        }

        try {
          const userPerms = auth.permissions();
          if (!userPerms || userPerms.length === 0) {
            return true;
          }
        } catch {
          return true;
        }

        if (auth.hasAny(required)) {
          return true;
        }

        router.navigateByUrl('/home');
        return false;
      })
  );
};
