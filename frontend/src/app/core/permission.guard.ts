import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required: string[] = route.data?.['permissions'] || [];

  // If not authenticated, go to login
  if (!auth.isAuthenticated()) {
    router.navigateByUrl('/login');
    return false;
  }

  // If no permissions required, allow
  if (required.length === 0) return true;

  // If token has no permissions claim or it's empty, allow (align with menu visibility)
  try {
    const userPerms = auth.permissions();
    if (!userPerms || userPerms.length === 0) return true;
  } catch {
    return true; // be permissive if parsing error
  }

  // Otherwise enforce permission check
  if (auth.hasAny(required)) return true;

  // Redirect authenticated but unauthorized users to home to avoid login bounce
  router.navigateByUrl('/home');
  return false;
};
