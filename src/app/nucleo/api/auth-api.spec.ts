import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthApi } from './auth-api';

describe('AuthApi', () => {
  let api: AuthApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('hace POST a /api/auth/login con usuario y contraseña', () => {
    let token: string | undefined;
    api.iniciarSesion('ana@tienda.co', 'secreta-123').subscribe((r) => (token = r.token));

    const peticion = http.expectOne('/api/auth/login');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ usuario: 'ana@tienda.co', contrasena: 'secreta-123' });
    peticion.flush({ token: 'jwt-de-prueba' });

    expect(token).toBe('jwt-de-prueba');
  });
});
