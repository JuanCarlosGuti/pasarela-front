import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CuentaLiquidacion {
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

export interface ComercioRegistrado {
  id: string;
  razonSocial: string;
  nit: string;
  estadoVerificacion: string;
  registradoEn: string;
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
}
