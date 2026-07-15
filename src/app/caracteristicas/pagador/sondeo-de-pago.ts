import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { PagosApi } from '../../nucleo/api/pagos-api';

export type ResultadoDePago = 'cargando' | 'esperando' | 'pagada' | 'expirada' | 'no-existe';

const INTERVALO_MS = 2500;
const ESTADOS_PAGADA = new Set(['PAGO_DETECTADO', 'CONVERTIDA', 'LIQUIDADA']);

/**
 * Sondeo de la página del pagador (HUF-006, mismo patrón de ADR-F003 que
 * SondeoDeOrden de la caja). Vive en su propia característica porque
 * `caracteristicas/*` no se importan entre sí (docs/02); si aparece un
 * tercer consumidor, este mecanismo se extrae a compartido/.
 *
 * Diferencia clave con la caja: la primera consulta es INMEDIATA (no
 * espera 2.5s) — así se detecta rápido una referencia inexistente (404)
 * sin dejar al pagador mirando "Cargando…" de más.
 */
@Injectable({ providedIn: 'root' })
export class SondeoDePago {
  private readonly api = inject(PagosApi);

  readonly resultado = signal<ResultadoDePago>('cargando');
  readonly sinConexion = signal(false);
  readonly monto = signal<number | null>(null);

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private enVuelo = false;
  private referencia = '';

  iniciar(referencia: string): void {
    this.detener();
    this.referencia = referencia;
    this.resultado.set('cargando');
    this.sinConexion.set(false);
    this.monto.set(null);
    this.consultar();
    this.temporizador = setInterval(() => this.consultar(), INTERVALO_MS);
  }

  detener(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
    this.enVuelo = false;
  }

  private consultar(): void {
    if (this.enVuelo) {
      return;
    }
    this.enVuelo = true;
    this.api.consultarPago(this.referencia).subscribe({
      next: (pago) => {
        this.enVuelo = false;
        this.sinConexion.set(false);
        this.monto.set(pago.monto);
        if (ESTADOS_PAGADA.has(pago.estado)) {
          this.resultado.set('pagada');
          this.detener();
        } else if (pago.estado === 'EXPIRADA') {
          this.resultado.set('expirada');
          this.detener();
        } else {
          this.resultado.set('esperando');
        }
      },
      error: (fallo: HttpErrorResponse) => {
        this.enVuelo = false;
        if (fallo.status === 404) {
          this.resultado.set('no-existe');
          this.detener();
          return;
        }
        this.sinConexion.set(true); // sigue intentando: el tick sigue vivo
      },
    });
  }
}
