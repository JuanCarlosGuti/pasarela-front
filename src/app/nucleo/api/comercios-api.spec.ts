import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComerciosApi } from './comercios-api';

describe('ComerciosApi', () => {
  let api: ComerciosApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ComerciosApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registra un comercio con POST /api/comercios', () => {
    let respuesta: unknown;
    api
      .registrar({
        razonSocial: 'Café Central',
        nit: '900650321-2',
        cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001234567', titular: 'Café Central' },
        credenciales: { email: 'ana@cafe.co', contrasena: 'secreta-12345678' },
      })
      .subscribe((r) => (respuesta = r));

    const peticion = http.expectOne('/api/comercios');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body.nit).toBe('900650321-2');

    peticion.flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'PENDIENTE',
      registradoEn: '2026-07-15T10:00:00Z',
      limites: { topePorTransaccion: 2000000, topeMensual: 20000000 },
    });

    expect(respuesta).toMatchObject({ id: 'com-1', estadoVerificacion: 'PENDIENTE' });
  });

  it('consulta un comercio con GET /api/comercios/{id}', () => {
    api.consultar('com-1').subscribe();
    const peticion = http.expectOne('/api/comercios/com-1');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'PENDIENTE',
      registradoEn: '2026-07-15T10:00:00Z',
    });
  });
});
