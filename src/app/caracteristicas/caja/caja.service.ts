import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OrdenCreada, OrdenesApi } from '../../nucleo/api/ordenes-api';

export type FaseDeCaja = 'digitando' | 'creando' | 'esperando' | 'pagada' | 'expirada';

const MAXIMO_DIGITOS = 9;

/**
 * Estado de la caja (HUF-003): el flujo digitar → COBRAR → esperar. Los
 * errores NUNCA pierden el monto digitado — el cajero corrige, no reinicia.
 * El front no valida topes ni reglas de negocio: muestra lo que el backend
 * responda (REGLA DE ORO 1).
 */
@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly api = inject(OrdenesApi);

  readonly fase = signal<FaseDeCaja>('digitando');
  readonly error = signal<string | null>(null);
  readonly orden = signal<OrdenCreada | null>(null);

  private readonly digitos = signal('');

  readonly monto = computed(() => Number(this.digitos() || '0'));
  readonly montoFormateado = computed(
    () => '$ ' + new Intl.NumberFormat('es-CO').format(this.monto()),
  );

  digitar(digito: string): void {
    if (!/^[0-9]$/.test(digito) || this.fase() !== 'digitando') {
      return;
    }
    const actual = this.digitos();
    if (actual.length >= MAXIMO_DIGITOS || (actual === '' && digito === '0')) {
      return;
    }
    this.digitos.set(actual + digito);
  }

  borrar(): void {
    this.digitos.set(this.digitos().slice(0, -1));
  }

  limpiar(): void {
    this.digitos.set('');
    this.error.set(null);
    this.orden.set(null);
    this.fase.set('digitando');
  }

  cobrar(): void {
    if (this.monto() <= 0 || this.fase() !== 'digitando') {
      return;
    }
    this.fase.set('creando');
    this.error.set(null);
    this.api.crearOrden(this.monto()).subscribe({
      next: (orden) => {
        this.orden.set(orden);
        this.fase.set('esperando');
      },
      error: (fallo: HttpErrorResponse) => {
        this.fase.set('digitando'); // el monto sigue ahí: se corrige o reintenta
        this.error.set(mensajeDeError(fallo));
      },
    });
  }
}

function mensajeDeError(fallo: HttpErrorResponse): string {
  const mensajeDelBackend = (fallo.error as { mensaje?: string } | null)?.mensaje;
  if (fallo.status === 422 && mensajeDelBackend) {
    return mensajeDelBackend;
  }
  if (fallo.status === 502) {
    return 'No pudimos crear el cobro. Reintenta';
  }
  return mensajeDelBackend ?? 'Algo falló al crear el cobro. Reintenta';
}
