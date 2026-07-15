import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Comprobante, OrdenesApi } from '../../nucleo/api/ordenes-api';

interface EstadoVisual {
  etiqueta: string;
  clase: string;
}

const ESTADOS: Record<string, EstadoVisual> = {
  PAGO_DETECTADO: { etiqueta: 'Pagado', clase: 'pagado' },
  CONVERTIDA: { etiqueta: 'Pagado', clase: 'pagado' },
  LIQUIDADA: { etiqueta: 'Liquidado', clase: 'pagado' },
};

/**
 * Comprobante de venta (HUF-011): imprimible y compartible. Solo existe
 * para órdenes pagadas o liquidadas — el 422 de una orden sin pagar se
 * muestra tal cual lo explica el backend, sin reinterpretarlo.
 */
@Component({
  selector: 'app-pagina-comprobante',
  imports: [],
  templateUrl: './pagina-comprobante.html',
  styleUrl: './pagina-comprobante.scss',
})
export class PaginaComprobante implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(OrdenesApi);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly comprobante = signal<Comprobante | null>(null);

  ngOnInit(): void {
    this.ruta.paramMap.subscribe((parametros) => {
      const id = parametros.get('id');
      if (id) {
        this.cargar(id);
      }
    });
  }

  protected imprimir(): void {
    window.print();
  }

  protected estadoVisual(estado: string): EstadoVisual {
    return ESTADOS[estado] ?? { etiqueta: estado, clase: 'desconocido' };
  }

  protected formatearMonto(monto: number): string {
    return '$ ' + new Intl.NumberFormat('es-CO').format(monto);
  }

  protected formatearFecha(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.comprobante(id).subscribe({
      next: (comprobante) => {
        this.comprobante.set(comprobante);
        this.cargando.set(false);
      },
      error: (fallo: HttpErrorResponse) => {
        const mensajeDelBackend = (fallo.error as { mensaje?: string } | null)?.mensaje;
        this.error.set(mensajeDelBackend ?? 'No pudimos cargar el comprobante. Intenta de nuevo');
        this.cargando.set(false);
      },
    });
  }
}
