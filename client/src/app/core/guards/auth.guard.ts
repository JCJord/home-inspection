import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && !authService.isTokenExpired()) {
    return true;
  }

  // If token is expired, AuthService constructor or Interceptor will likely 
  // handle the refresh, but for the guard transition, we redirect if we can't 
  // guarantee validity.
  authService.logout(); 
  return router.parseUrl('/auth/login');
};
