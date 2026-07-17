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
        cuentaLiquidacion: {
          banco: 'Nequi',
          tipo: 'AHORROS',
          numero: '3001234567',
          titular: 'Café Central',
        },
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

  it('lista los comercios paginados, con filtro de estado opcional (HUF-012/016)', () => {
    api.listar().subscribe();
    const sinFiltro = http.expectOne((req) => req.url === '/api/comercios');
    expect(sinFiltro.request.method).toBe('GET');
    expect(sinFiltro.request.params.has('estado')).toBe(false);
    expect(sinFiltro.request.params.get('pagina')).toBe('0');
    expect(sinFiltro.request.params.get('tamano')).toBe('20');
    sinFiltro.flush({ comercios: [], totalElementos: 0, pagina: 0, tamano: 20 });

    api.listar('PENDIENTE', 2, 10).subscribe();
    const conFiltro = http.expectOne((req) => req.url === '/api/comercios');
    expect(conFiltro.request.params.get('estado')).toBe('PENDIENTE');
    expect(conFiltro.request.params.get('pagina')).toBe('2');
    conFiltro.flush({ comercios: [], totalElementos: 0, pagina: 2, tamano: 10 });
  });

  it('decide la verificación con POST /api/comercios/{id}/verificacion (HUF-012)', () => {
    api.decidirVerificacion('com-1', 'RECHAZAR', 'Documentos ilegibles').subscribe();

    const peticion = http.expectOne('/api/comercios/com-1/verificacion');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      decision: 'RECHAZAR',
      motivo: 'Documentos ilegibles',
    });
    peticion.flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'RECHAZADO',
      registradoEn: '2026-07-15T10:00:00Z',
    });
  });

  it('aprobar no envía motivo (el backend no lo exige para APROBAR)', () => {
    api.decidirVerificacion('com-1', 'APROBAR').subscribe();

    const peticion = http.expectOne('/api/comercios/com-1/verificacion');
    expect(peticion.request.body).toEqual({ decision: 'APROBAR', motivo: null });
    peticion.flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'VERIFICADO',
      registradoEn: '2026-07-15T10:00:00Z',
    });
  });

  it('actualiza los topes con PUT /api/comercios/{id}/limites (HUF-013)', () => {
    let respuesta: unknown;
    api
      .actualizarLimites('com-1', { topePorTransaccion: 500000, topeMensual: 10000000 })
      .subscribe((r) => (respuesta = r));

    const peticion = http.expectOne('/api/comercios/com-1/limites');
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({
      topePorTransaccion: 500000,
      topeMensual: 10000000,
    });
    peticion.flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'VERIFICADO',
      registradoEn: '2026-07-15T10:00:00Z',
      limites: { topePorTransaccion: 500000, topeMensual: 10000000 },
    });

    expect(respuesta).toMatchObject({
      limites: { topePorTransaccion: 500000, topeMensual: 10000000 },
    });
  });
});
