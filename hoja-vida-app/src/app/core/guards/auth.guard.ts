import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

/** Protege las rutas privadas: sin sesión válida redirige al login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const tokens = inject(TokenStorageService);
  const router = inject(Router);
  if (auth.autenticado() && tokens.esValido()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Evita que un usuario autenticado vuelva a login/registro. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const tokens = inject(TokenStorageService);
  return auth.autenticado() && tokens.esValido() ? inject(Router).createUrlTree([auth.esAdmin() ? '/admin' : '/inicio']) : true;
};

/** Solo administradores. La API valida el rol de nuevo (defensa en profundidad). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.esAdmin() ? true : inject(Router).createUrlTree(['/inicio']);
};

/**
 * Secciones personales de hoja de vida: solo para usuarios (no administradores).
 * El administrador de la institución trabaja desde /admin.
 */
export const usuarioGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.esAdmin() ? inject(Router).createUrlTree(['/admin']) : true;
};
