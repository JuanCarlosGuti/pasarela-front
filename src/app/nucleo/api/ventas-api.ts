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

/**
 * Cliente del historial de ventas del backend. Sin desde/hasta: el backend
 * decide el rango (mes en curso, zona Colombia) — el front no reimplementa
 * el corte de día calendario que ya vive en ConsultarVentasService.
 */
@Injectable({ providedIn: 'root' })
export class VentasApi {
  private readonly http = inject(HttpClient);

  listar(tamano = 20): Observable<PaginaVentas> {
    const params = new HttpParams().set('pagina', 0).set('tamano', tamano);
    return this.http.get<PaginaVentas>('/api/ventas', { params });
  }

  /** Ventas del día y del mes en curso (zona Colombia, decide el backend). */
  resumen(): Observable<ResumenDeVentas> {
    return this.http.get<ResumenDeVentas>('/api/ventas/resumen');
  }
}
