import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RespuestaDeLogin {
  token: string;
}

/** Cliente del contexto de seguridad del backend (POST /api/auth/login). */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  iniciarSesion(usuario: string, contrasena: string): Observable<RespuestaDeLogin> {
    return this.http.post<RespuestaDeLogin>('/api/auth/login', { usuario, contrasena });
  }
}
