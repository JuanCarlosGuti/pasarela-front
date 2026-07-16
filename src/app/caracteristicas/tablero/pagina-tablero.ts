import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ResumenDeVentas, VentasApi } from '../../nucleo/api/ventas-api';
import { HistorialDeVentas } from './historial-de-ventas';
import { LiquidacionesSimuladas } from './liquidaciones-simuladas';

/**
 * El tablero del comercio (HUF-008/009/014): ventas de hoy y del mes en
 * tarjetas grandes, el historial filtrado y las liquidaciones simuladas
 * debajo. El resumen se refresca solo al volver a la pestaña — un dueño que
 * la deja abierta en el mostrador no debería ver números viejos.
 */
@Component({
  selector: 'app-pagina-tablero',
  imports: [HistorialDeVentas, LiquidacionesSimuladas],
  templateUrl: './pagina-tablero.html',
  styleUrl: './pagina-tablero.scss',
})
export class PaginaTablero implements OnInit, OnDestroy {
  private readonly api = inject(VentasApi);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly resumen = signal<ResumenDeVentas | null>(null);

  private readonly alVolverVisible = (): void => {
    if (document.visibilityState === 'visible') {
      this.cargar();
    }
  };

  ngOnInit(): void {
    this.cargar();
    document.addEventListener('visibilitychange', this.alVolverVisible);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.alVolverVisible);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.resumen().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar tus ventas. Intenta de nuevo');
        this.cargando.set(false);
      },
    });
  }

  protected formatear(monto: number): string {
    return '$ ' + new Intl.NumberFormat('es-CO').format(monto);
  }
}
