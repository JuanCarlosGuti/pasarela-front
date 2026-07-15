import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OrdenCreada, OrdenesApi } from '../../nucleo/api/ordenes-api';
import { SondeoDeOrden } from './sondeo-de-orden';

export type FaseDeCaja = 'digitando' | 'creando' | 'esperando' | 'pagada' | 'expirada';

const MAXIMO_DIGITOS = 9;

/**
 * Estado de la caja (HUF-003/004): digitar → COBRAR → esperar (sondeo
 * ADR-F003 + cuenta regresiva) → PAGADO ✓ o EXPIRADA. Los errores NUNCA
 * pierden el monto digitado, y "volver a cobrar" tras expirar lo precarga.
 * El front no valida reglas de negocio: muestra lo que el backend responda.
 */
@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly api = inject(OrdenesApi);
  private readonly sondeo = inject(SondeoDeOrden);

  readonly fase = signal<FaseDeCaja>('digitando');
  readonly error = signal<string | null>(null);
  readonly orden = signal<OrdenCreada | null>(null);
  readonly cuentaRegresiva = signal('');
  readonly horaDePago = signal('');
  readonly sinConexion = this.sondeo.sinConexion;

  private readonly digitos = signal('');
  private temporizadorDeCuenta: ReturnType<typeof setInterval> | null = null;

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
    this.suspender();
    this.digitos.set('');
    this.error.set(null);
    this.orden.set(null);
    this.fase.set('digitando');
  }

  /** Tras EXPIRADA: el mismo monto queda precargado (criterio de HUF-004). */
  volverACobrar(): void {
    this.suspender();
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
        this.vigilar(orden);
      },
      error: (fallo: HttpErrorResponse) => {
        this.fase.set('digitando'); // el monto sigue ahí: se corrige o reintenta
        this.error.set(mensajeDeError(fallo));
      },
    });
  }

  /** Al salir de la pantalla: ni sondeo ni cuenta siguen corriendo. */
  suspender(): void {
    this.sondeo.detener();
    this.pararCuenta();
  }

  /** Al volver a la pantalla con una espera viva, se retoma todo. */
  reanudar(): void {
    const orden = this.orden();
    if (this.fase() === 'esperando' && orden !== null) {
      this.vigilar(orden);
    }
  }

  private vigilar(orden: OrdenCreada): void {
    this.sondeo.iniciar(orden.id, {
      pagada: () => {
        this.pararCuenta();
        this.horaDePago.set(
          new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(
            new Date(),
          ),
        );
        this.fase.set('pagada');
      },
      expirada: () => {
        this.pararCuenta();
        this.fase.set('expirada');
      },
    });
    this.iniciarCuenta(orden.expiraEn);
  }

  private iniciarCuenta(expiraEn: string): void {
    this.pararCuenta();
    const fin = new Date(expiraEn).getTime();
    const pintar = () => {
      const segundos = Math.max(0, Math.floor((fin - Date.now()) / 1000));
      const minutos = Math.floor(segundos / 60);
      this.cuentaRegresiva.set(`${minutos}:${String(segundos % 60).padStart(2, '0')}`);
      if (segundos <= 0) {
        this.pararCuenta();
      }
    };
    pintar();
    this.temporizadorDeCuenta = setInterval(pintar, 1000);
  }

  private pararCuenta(): void {
    if (this.temporizadorDeCuenta !== null) {
      clearInterval(this.temporizadorDeCuenta);
      this.temporizadorDeCuenta = null;
    }
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
