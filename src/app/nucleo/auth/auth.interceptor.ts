import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SesionService } from './sesion.service';

/**
 * Interceptor de sesión (HUF-002):
 * - Agrega Authorization SOLO a /api/* y solo con sesión activa — el token
 *   jamás viaja a orígenes ajenos.
 * - 401 con sesión activa = token vencido: cierra la sesión, deja el aviso
 *   para el login y navega a /entrar. El 401 del propio login NO pasa por
 *   aquí como expiración (lo maneja su pantalla con el error genérico).
 * - 403 = sin permiso: pantalla /prohibido, sin tumbar la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (solicitud, siguiente) => {
  const sesion = inject(SesionService);
  const router = inject(Router);

  const esDeLaApi = solicitud.url.startsWith('/api/');
  const token = sesion.token();
  const conAutorizacion =
    esDeLaApi && token !== null
      ? solicitud.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : solicitud;

  return siguiente(conAutorizacion).pipe(
    catchError((fallo: HttpErrorResponse) => {
      const esLogin = solicitud.url.startsWith('/api/auth/login');
      if (esDeLaApi && !esLogin && fallo.status === 401 && sesion.estaAutenticada()) {
        sesion.marcarExpirada();
        router.navigateByUrl('/entrar');
      }
      if (esDeLaApi && fallo.status === 403) {
        router.navigateByUrl('/prohibido');
      }
      return throwError(() => fallo);
    }),
  );
};
