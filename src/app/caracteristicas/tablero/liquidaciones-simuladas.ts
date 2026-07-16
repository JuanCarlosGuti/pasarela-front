import { Component, inject, OnInit, signal } from '@angular/core';
import { Liquidacion, LiquidacionesApi } from '../../nucleo/api/liquidaciones-api';

/**
 * "Tus liquidaciones" (HUF-014): muestra la conversión cripto → COP que
 * cayó en la cuenta del comercio. SOLO SIMULACIÓN (HU-025 del backend) —
 * mientras no haya un proveedor de rampa contratado (T-007), este desglose
 * lo arma un simulador; se reemplaza por datos reales sin tocar esta
 * pantalla (mismo contrato).
 */
@Component({
  selector: 'app-liquidaciones-simuladas',
  imports: [],
  templateUrl: './liquidaciones-simuladas.html',
  styleUrl: './liquidaciones-simuladas.scss',
})
export class LiquidacionesSimuladas implements OnInit {
  private readonly api = inject(LiquidacionesApi);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly liquidaciones = signal<Liquidacion[]>([]);

  ngOnInit(): void {
    this.api.listar().subscribe({
      next: (liquidaciones) => {
        this.liquidaciones.set(liquidaciones);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar tus liquidaciones. Intenta de nuevo');
        this.cargando.set(false);
      },
    });
  }

  protected formatearMonto(monto: number): string {
    return '$ ' + new Intl.NumberFormat('es-CO').format(monto);
  }

  protected formatearFecha(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  }

  protected trackPorId(_indice: number, liquidacion: Liquidacion): string {
    return liquidacion.id;
  }
}
