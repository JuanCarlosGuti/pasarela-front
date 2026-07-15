import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PaginaVentas, VentaResumen, VentasApi } from '../../nucleo/api/ventas-api';

const ESTADOS_CON_COMPROBANTE = new Set(['PAGO_DETECTADO', 'CONVERTIDA', 'LIQUIDADA']);

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
 * Historial de movimientos del tablero (HUF-009): lista paginada con
 * filtro de fechas. Móvil = tarjetas, escritorio = tabla (docs/04) — ambas
 * marcaciones se generan siempre; qué se ve es solo CSS (sin detección de
 * dispositivo en TS).
 */
@Component({
  selector: 'app-historial-de-ventas',
  imports: [FormsModule, RouterLink],
  templateUrl: './historial-de-ventas.html',
  styleUrl: './historial-de-ventas.scss',
})
export class HistorialDeVentas implements OnInit {
  private readonly api = inject(VentasApi);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal<PaginaVentas | null>(null);
  protected readonly descargando = signal(false);
  protected readonly errorDescarga = signal<string | null>(null);

  protected desde = '';
  protected hasta = '';
  private paginaActual = 0;

  ngOnInit(): void {
    this.cargar();
  }

  protected filtrar(): void {
    this.paginaActual = 0;
    this.cargar();
  }

  protected paginaAnterior(): void {
    if (this.paginaActual === 0) {
      return;
    }
    this.paginaActual -= 1;
    this.cargar();
  }

  protected paginaSiguiente(): void {
    this.paginaActual += 1;
    this.cargar();
  }

  /** CSV contador-ready (HUF-010) con el MISMO rango vigente del historial. */
  protected descargarCsv(): void {
    this.descargando.set(true);
    this.errorDescarga.set(null);
    this.api
      .exportar({ desde: this.desde || undefined, hasta: this.hasta || undefined })
      .subscribe({
        next: (csv) => {
          this.descargando.set(false);
          const url = URL.createObjectURL(csv);
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = 'movimientos.csv';
          enlace.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.descargando.set(false);
          this.errorDescarga.set('No pudimos generar el archivo. Intenta de nuevo');
        },
      });
  }

  protected get hayPaginaSiguiente(): boolean {
    const datos = this.pagina();
    if (datos === null) {
      return false;
    }
    return (this.paginaActual + 1) * datos.tamano < datos.totalElementos;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listar({
        desde: this.desde || undefined,
        hasta: this.hasta || undefined,
        pagina: this.paginaActual,
      })
      .subscribe({
        next: (pagina) => {
          this.pagina.set(pagina);
          this.cargando.set(false);
        },
        error: (fallo: HttpErrorResponse) => {
          const mensajeDelBackend = (fallo.error as { mensaje?: string } | null)?.mensaje;
          this.error.set(mensajeDelBackend ?? 'No pudimos cargar tu historial. Intenta de nuevo');
          this.cargando.set(false);
        },
      });
  }

  protected estadoVisual(estado: string): EstadoVisual {
    return ESTADOS[estado] ?? { etiqueta: estado, clase: 'desconocido' };
  }

  /** Solo las órdenes pagadas/liquidadas tienen comprobante (HUF-011); las demás darían 422. */
  protected tieneComprobante(estado: string): boolean {
    return ESTADOS_CON_COMPROBANTE.has(estado);
  }

  protected formatearMonto(monto: number): string {
    return '$ ' + new Intl.NumberFormat('es-CO').format(monto);
  }

  protected formatearFecha(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  protected trackPorId(_indice: number, orden: VentaResumen): string {
    return orden.id;
  }
}
