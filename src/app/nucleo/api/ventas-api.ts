import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface VentaResumen {
  id: string;
  referencia: string;
  estado: string;
  monto: number;
  creadaEn: string;
}

export interface PaginaVentas {
  ordenes: VentaResumen[];
  totalElementos: number;
  pagina: number;
  tamano: number;
}

export interface TotalDeVentas {
  total: number;
  cantidad: number;
}

export interface ResumenDeVentas {
  dia: TotalDeVentas;
  mes: TotalDeVentas;
}

export interface FiltrosDeVentas {
  /** Fechas 'yyyy-MM-dd'; sin ellas, el backend decide el rango (mes en curso). */
  desde?: string;
  hasta?: string;
  pagina?: number;
  tamano?: number;
}

/**
 * Cliente del historial de ventas del backend. Sin desde/hasta: el backend
 * decide el rango (mes en curso, zona Colombia) — el front no reimplementa
 * el corte de día calendario que ya vive en ConsultarVentasService.
 */
@Injectable({ providedIn: 'root' })
export class VentasApi {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosDeVentas = {}): Observable<PaginaVentas> {
    const { desde, hasta, pagina = 0, tamano = 20 } = filtros;
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    if (desde) {
      params = params.set('desde', desde);
    }
    if (hasta) {
      params = params.set('hasta', hasta);
    }
    return this.http.get<PaginaVentas>('/api/ventas', { params });
  }

  /** Ventas del día y del mes en curso (zona Colombia, decide el backend). */
  resumen(): Observable<ResumenDeVentas> {
    return this.http.get<ResumenDeVentas>('/api/ventas/resumen');
  }
}
