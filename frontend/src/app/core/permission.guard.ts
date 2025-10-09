import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required: string[] = route.data?.['permissions'] || [];
  if(auth.isAuthenticated() && (required.length === 0 || auth.hasAny(required))){
    return true;
  }
  router.navigateByUrl('/login');
  return false;
};
