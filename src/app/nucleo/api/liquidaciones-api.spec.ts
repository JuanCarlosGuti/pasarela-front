import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LiquidacionesApi } from './liquidaciones-api';

/** HUF-014: liquidaciones simuladas — SOLO SIMULACIÓN (HU-025 del backend). */
describe('LiquidacionesApi', () => {
  let api: LiquidacionesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(LiquidacionesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista las liquidaciones del comercio con GET /api/liquidaciones', () => {
    let respuesta: unknown;
    api.listar().subscribe((r) => (respuesta = r));

    const peticion = http.expectOne('/api/liquidaciones');
    expect(peticion.request.method).toBe('GET');
    peticion.flush([
      {
        id: 'liq-1',
        comercioId: 'com-1',
        ordenes: ['ord-1'],
        montoBruto: 100000,
        comisionPlataforma: 2500,
        comisionRampa: 800,
        tasaCambioSimulada: 4150,
        cuentaDestinoDescripcion: 'NEQUI ••••4567 — Doña Rosa',
        montoNetoComercio: 96700,
        referenciaProveedor: 'RAMPA-SIM-ABC12345',
        estado: 'REGISTRADA',
        detalleDiscrepancia: null,
        liquidadaEn: '2026-07-15T14:00:00Z',
      },
    ]);

    expect(respuesta).toMatchObject([{ id: 'liq-1', comisionRampa: 800 }]);
  });
});
