import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * SOLO SIMULACIÓN (HU-025 del backend): mientras no haya un proveedor de
 * rampa contratado, este desglose lo arma un simulador — no representa una
 * conversión real ni dinero real. El campo `estado` reutiliza el mismo
 * vocabulario que el resto del dominio (REGISTRADA/CONCILIADA/DISCREPANCIA).
 */
export interface Liquidacion {
  id: string;
  comercioId: string;
  ordenes: string[];
  montoBruto: number;
  comisionPlataforma: number;
  comisionRampa: number;
  tasaCambioSimulada: number;
  cuentaDestinoDescripcion: string;
  montoNetoComercio: number;
  referenciaProveedor: string;
  estado: string;
  detalleDiscrepancia: string | null;
  liquidadaEn: string;
}

/** Cliente de las liquidaciones del comercio (HUF-014). */
@Injectable({ providedIn: 'root' })
export class LiquidacionesApi {
  private readonly http = inject(HttpClient);

  listar(): Observable<Liquidacion[]> {
    return this.http.get<Liquidacion[]>('/api/liquidaciones');
  }
}
