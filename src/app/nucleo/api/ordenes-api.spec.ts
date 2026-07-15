import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OrdenesApi } from './ordenes-api';

describe('OrdenesApi', () => {
  let api: OrdenesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(OrdenesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea una orden con POST /api/ordenes', () => {
    let respuesta: unknown;
    api.crearOrden(25000).subscribe((r) => (respuesta = r));

    const peticion = http.expectOne('/api/ordenes');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ monto: 25000 });
    peticion.flush({
      id: 'orden-1',
      referencia: 'ref-1',
      estado: 'PENDIENTE_PAGO',
      monto: 25000,
      expiraEn: '2026-07-15T15:00:00Z',
      qr: { contenido: 'PAGOSIM|ref-1|25000', deeplink: 'pasarela-sim://pagar/ref-1' },
    });

    expect(respuesta).toMatchObject({ id: 'orden-1', qr: { contenido: 'PAGOSIM|ref-1|25000' } });
  });

  it('consulta el detalle con GET /api/ordenes/{id}', () => {
    api.consultarOrden('orden-1').subscribe();

    const peticion = http.expectOne('/api/ordenes/orden-1');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ id: 'orden-1', estado: 'PAGO_DETECTADO' });
  });
});
