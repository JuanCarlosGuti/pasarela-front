import { inject, Injectable, signal } from '@angular/core';
import { OrdenesApi } from '../../nucleo/api/ordenes-api';

export type ResultadoDeSondeo = 'esperando' | 'pagada' | 'expirada';

/** Avisos opcionales para quien orquesta (CajaService) — sin effects. */
export interface AvisosDeSondeo {
  pagada?: () => void;
  expirada?: () => void;
}

const INTERVALO_MS = 2500;
const ESTADOS_PAGADA = new Set(['PAGO_DETECTADO', 'CONVERTIDA', 'LIQUIDADA']);

/**
 * Sondeo del estado de una orden (ADR-F003): cada 2.5 s contra
 * GET /api/ordenes/{id} hasta que el backend reporte pago o expiración.
 *
 * Reglas: nunca hay dos consultas en vuelo (si la red está lenta, se salta
 * el tick); un error marca sinConexion pero el sondeo SIGUE — la caída de
 * datos móviles en el mostrador no puede tumbar la venta; detener() es
 * idempotente y obligatorio al salir de la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class SondeoDeOrden {
  private readonly api = inject(OrdenesApi);

  readonly resultado = signal<ResultadoDeSondeo>('esperando');
  readonly sinConexion = signal(false);

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private consultaEnVuelo = false;
  private avisos: AvisosDeSondeo | undefined;

  iniciar(ordenId: string, avisos?: AvisosDeSondeo): void {
    this.detener();
    this.avisos = avisos;
    this.resultado.set('esperando');
    this.sinConexion.set(false);
    this.temporizador = setInterval(() => this.consultar(ordenId), INTERVALO_MS);
  }

  detener(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
    this.consultaEnVuelo = false;
  }

  private consultar(ordenId: string): void {
    if (this.consultaEnVuelo) {
      return;
    }
    this.consultaEnVuelo = true;
    this.api.consultarOrden(ordenId).subscribe({
      next: (orden) => {
        this.consultaEnVuelo = false;
        this.sinConexion.set(false);
        if (ESTADOS_PAGADA.has(orden.estado)) {
          this.resultado.set('pagada');
          this.detener();
          this.avisos?.pagada?.();
        } else if (orden.estado === 'EXPIRADA') {
          this.resultado.set('expirada');
          this.detener();
          this.avisos?.expirada?.();
        }
      },
      error: () => {
        this.consultaEnVuelo = false;
        this.sinConexion.set(true); // seguir intentando: el tick sigue vivo
      },
    });
  }
}
