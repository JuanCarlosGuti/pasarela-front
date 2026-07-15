import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Contrato estricto de la página pública del pagador: SOLO estado y monto. */
export interface PagoPublico {
  estado: string;
  monto: number;
}

/** Cliente de la consulta pública por referencia (sin sesión). */
@Injectable({ providedIn: 'root' })
export class PagosApi {
  private readonly http = inject(HttpClient);

  consultarPago(referencia: string): Observable<PagoPublico> {
    return this.http.get<PagoPublico>(`/api/pagos/${referencia}`);
  }
}
