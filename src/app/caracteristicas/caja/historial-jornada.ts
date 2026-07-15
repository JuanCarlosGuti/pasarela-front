import { Component, inject, OnInit, signal } from '@angular/core';
import { OrdenDetalle, OrdenesApi } from '../../nucleo/api/ordenes-api';
import { VentaResumen, VentasApi } from '../../nucleo/api/ventas-api';

interface EstadoVisual {
  etiqueta: string;
  clase: string;
}

const ESTADOS: Record<string, EstadoVisual> = {
  PENDIENTE_PAGO: { etiqueta: 'Pendiente', clase: 'pendiente' },
  PAGO_DETECTADO: { etiqueta: 'Pagado', clase: 'pagado' },
  CONVERTIDA: { etiqueta: 'Pagado', clase: 'pagado' },
  LIQUIDADA: { etiqueta: 'Pagado', clase: 'pagado' },
  EXPIRADA: { etiqueta: 'Expiró', clase: 'expirado' },
  FALLIDA: { etiqueta: 'Revisar', clase: 'alerta' },
  EN_REVISION: { etiqueta: 'Revisar', clase: 'alerta' },
};

/**
 * Últimos cobros de la caja (HUF-005): "¿sí te llegó?" sin salir de la
 * pantalla. Alimentado por /api/ventas (el backend decide el rango — el
 * front no reimplementa el corte de día calendario en zona Colombia).
 */
@Component({
  selector: 'app-historial-jornada',
  templateUrl: './historial-jornada.html',
  styleUrl: './historial-jornada.scss',
})
export class HistorialJornada implements OnInit {
  private readonly ventasApi = inject(VentasApi);
  private readonly ordenesApi = inject(OrdenesApi);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly ordenes = signal<VentaResumen[]>([]);

  protected readonly cargandoDetalle = signal(false);
  protected readonly detalle = signal<OrdenDetalle | null>(null);

  ngOnInit(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.ventasApi.listar().subscribe({
      next: (pagina) => {
        this.ordenes.set(pagina.ordenes);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar tus cobros. Intenta de nuevo');
        this.cargando.set(false);
      },
    });
  }

  protected verDetalle(id: string): void {
    this.cargandoDetalle.set(true);
    this.ordenesApi.consultarOrden(id).subscribe({
      next: (orden) => {
        this.detalle.set(orden);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.cargandoDetalle.set(false);
      },
    });
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  protected estadoVisual(estado: string): EstadoVisual {
    return ESTADOS[estado] ?? { etiqueta: estado, clase: 'desconocido' };
  }

  protected formatearMonto(monto: number): string {
    return '$ ' + new Intl.NumberFormat('es-CO').format(monto);
  }

  protected formatearHora(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    );
  }
}
