import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface QrDeCobro {
  contenido: string;
  deeplink: string;
}

export interface OrdenCreada {
  id: string;
  referencia: string;
  estado: string;
  monto: number;
  expiraEn: string;
  qr: QrDeCobro;
}

export interface TransicionDeOrden {
  desde: string;
  hacia: string;
  momento: string;
}

export interface OrdenDetalle {
  id: string;
  referencia: string;
  estado: string;
  monto: number;
  creadaEn: string;
  expiraEn: string;
  transiciones: TransicionDeOrden[];
}

/** Cliente del contexto de pagos del backend (órdenes de cobro). */
@Injectable({ providedIn: 'root' })
export class OrdenesApi {
  private readonly http = inject(HttpClient);

  crearOrden(monto: number): Observable<OrdenCreada> {
    return this.http.post<OrdenCreada>('/api/ordenes', { monto });
  }

  /** Detalle del dueño; también es el endpoint de polling (ADR-F003). */
  consultarOrden(id: string): Observable<OrdenDetalle> {
    return this.http.get<OrdenDetalle>(`/api/ordenes/${id}`);
  }
}
