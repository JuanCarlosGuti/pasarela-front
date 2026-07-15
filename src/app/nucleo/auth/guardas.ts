import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from './sesion.service';

/**
 * Guarda por rol (HUF-002): sin sesión → /entrar; con sesión pero rol
 * equivocado → /prohibido. La autorización REAL vive en el backend — esto
 * solo evita mostrar pantallas que van a fallar.
 */
export function guardaDeRol(rolRequerido: 'COMERCIO' | 'ADMIN'): CanActivateFn {
  return () => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    if (!sesion.estaAutenticada()) {
      return router.parseUrl('/entrar');
    }
    if (sesion.rol() !== rolRequerido) {
      return router.parseUrl('/prohibido');
    }
    return true;
  };
}
