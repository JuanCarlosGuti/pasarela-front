import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CuentaLiquidacion {
  /** Banco o billetera (Nequi, Bancolombia...) — HUF-016/HU-027. */
  banco: string;
  tipo: string;
  numero: string;
  titular: string;
}

export interface Credenciales {
  email: string;
  contrasena: string;
}

export interface RegistroComercio {
  razonSocial: string;
  nit: string;
  cuentaLiquidacion: CuentaLiquidacion;
  credenciales: Credenciales;
}

export interface LimitesOperacion {
  topePorTransaccion: number;
  topeMensual: number;
}

export interface ComercioRegistrado {
  id: string;
  razonSocial: string;
  nit: string;
  estadoVerificacion: string;
  registradoEn: string;
  /** Presente en las respuestas del backend; opcional por compatibilidad. */
  limites?: LimitesOperacion;
}

export interface PaginaComercios {
  comercios: ComercioRegistrado[];
  totalElementos: number;
  pagina: number;
  tamano: number;
}

/** Cliente del registro de comercios (público — sin sesión). */
@Injectable({ providedIn: 'root' })
export class ComerciosApi {
  private readonly http = inject(HttpClient);

  registrar(datos: RegistroComercio): Observable<ComercioRegistrado> {
    return this.http.post<ComercioRegistrado>('/api/comercios', datos);
  }

  /** Protegido: el interceptor agrega el Authorization de la sesión activa. */
  consultar(id: string): Observable<ComercioRegistrado> {
    return this.http.get<ComercioRegistrado>(`/api/comercios/${id}`);
  }

  /** Cola de verificación del admin (HUF-012, paginada desde HUF-016). */
  listar(estado?: string, pagina = 0, tamano = 20): Observable<PaginaComercios> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<PaginaComercios>('/api/comercios', { params });
  }

  /**
   * APROBAR/RECHAZAR/SUSPENDER/REACTIVAR (HUF-012). El motivo lo exige el
   * BACKEND para rechazar y suspender — aquí solo se transporta.
   */
  decidirVerificacion(
    id: string,
    decision: string,
    motivo?: string,
  ): Observable<ComercioRegistrado> {
    return this.http.post<ComercioRegistrado>(`/api/comercios/${id}/verificacion`, {
      decision,
      motivo: motivo ?? null,
    });
  }

  /**
   * Topes en pesos (HUF-013). Las reglas de negocio (positivos, tope por
   * transacción ≤ mensual) las valida el BACKEND; el 400 llega con mensaje.
   */
  actualizarLimites(id: string, limites: LimitesOperacion): Observable<ComercioRegistrado> {
    return this.http.put<ComercioRegistrado>(`/api/comercios/${id}/limites`, limites);
  }
}
