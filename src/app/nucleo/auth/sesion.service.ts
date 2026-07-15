import { computed, Injectable, signal } from '@angular/core';

/**
 * Sesión del usuario (ADR-F002): el JWT vive SOLO en memoria — jamás en
 * localStorage/sessionStorage. Recargar la página implica volver a entrar;
 * es el costo aceptado para que un XSS no encuentre token persistido.
 *
 * Los claims se LEEN para enrutar y pintar UI, nunca se validan aquí: la
 * firma la verifica el backend en cada llamada (REGLA DE ORO 1 del front).
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly tokenActual = signal<string | null>(null);
  private readonly claims = signal<Record<string, unknown>>({});

  readonly estaAutenticada = computed(() => this.tokenActual() !== null);
  readonly rol = computed(() => (this.claims()['rol'] as string | undefined) ?? null);
  readonly comercioId = computed(() => (this.claims()['comercioId'] as string | undefined) ?? null);

  token(): string | null {
    return this.tokenActual();
  }

  iniciar(token: string): void {
    const claims = decodificarClaims(token);
    if (claims === null) {
      this.cerrar();
      return;
    }
    this.tokenActual.set(token);
    this.claims.set(claims);
  }

  cerrar(): void {
    this.tokenActual.set(null);
    this.claims.set({});
  }

  /** El token venció (401 del backend): cierra y deja el aviso para el login. */
  marcarExpirada(): void {
    this.cerrar();
    this.avisoDeExpiracion.set(true);
  }

  /** Lee y consume el aviso (se muestra UNA vez en la pantalla de entrar). */
  consumirAvisoDeExpiracion(): boolean {
    const habia = this.avisoDeExpiracion();
    this.avisoDeExpiracion.set(false);
    return habia;
  }

  private readonly avisoDeExpiracion = signal(false);
}

/** Payload del JWT (base64url) → claims; null si el token es ilegible. */
function decodificarClaims(token: string): Record<string, unknown> | null {
  const partes = token.split('.');
  if (partes.length !== 3) {
    return null;
  }
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
