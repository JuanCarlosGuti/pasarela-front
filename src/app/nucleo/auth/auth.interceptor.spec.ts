import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { SesionService } from './sesion.service';

function tokenConClaims(claims: Record<string, unknown>): string {
  const codificar = (parte: object) =>
    btoa(JSON.stringify(parte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${codificar({ alg: 'HS256' })}.${codificar(claims)}.firma-falsa`;
}

describe('authInterceptor (HUF-002)', () => {
  let http: HttpClient;
  let servidor: HttpTestingController;
  let sesion: SesionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    servidor = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => servidor.verify());

  it('agrega Authorization SOLO a las llamadas /api/* con sesión activa', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO' }));

    http.get('/api/ventas/resumen').subscribe();
    const conToken = servidor.expectOne('/api/ventas/resumen');
    expect(conToken.request.headers.get('Authorization')).toContain('Bearer ');
    conToken.flush({});

    http.get('/assets/logo.svg').subscribe();
    const sinToken = servidor.expectOne('/assets/logo.svg');
    expect(sinToken.request.headers.has('Authorization')).toBe(false);
    sinToken.flush({});
  });

  it('sin sesión no agrega el header ni siquiera a /api/*', () => {
    http.get('/api/pagos/ref-1').subscribe({ error: () => undefined });
    const peticion = servidor.expectOne('/api/pagos/ref-1');
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('un 401 con sesión activa la cierra, marca la expiración y vuelve a /entrar', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO' }));

    http.get('/api/ventas/resumen').subscribe({ error: () => undefined });
    servidor
      .expectOne('/api/ventas/resumen')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(sesion.estaAutenticada()).toBe(false);
    expect(sesion.consumirAvisoDeExpiracion()).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/entrar');
  });

  it('el 401 del PROPIO login no es una sesión expirada: lo maneja la pantalla', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    servidor.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(sesion.consumirAvisoDeExpiracion()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('un 403 lleva a la pantalla de prohibido sin cerrar la sesión', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO' }));

    http.get('/api/comercios/otro/verificacion').subscribe({ error: () => undefined });
    servidor
      .expectOne('/api/comercios/otro/verificacion')
      .flush({}, { status: 403, statusText: 'Forbidden' });

    expect(sesion.estaAutenticada()).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/prohibido');
  });
});
