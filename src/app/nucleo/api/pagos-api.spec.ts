import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PagosApi } from './pagos-api';

describe('PagosApi', () => {
  let api: PagosApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PagosApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el pago público con GET /api/pagos/{referencia}', () => {
    let respuesta: unknown;
    api.consultarPago('ref-1').subscribe((r) => (respuesta = r));

    const peticion = http.expectOne('/api/pagos/ref-1');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });

    expect(respuesta).toEqual({ estado: 'PENDIENTE_PAGO', monto: 25000 });
  });
});
