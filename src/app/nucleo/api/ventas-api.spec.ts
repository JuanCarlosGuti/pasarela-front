import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { VentasApi } from './ventas-api';

describe('VentasApi', () => {
  let api: VentasApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(VentasApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista ventas con GET /api/ventas y paginación por defecto', () => {
    let respuesta: unknown;
    api.listar().subscribe((r) => (respuesta = r));

    const peticion = http.expectOne((req) => req.url === '/api/ventas');
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('pagina')).toBe('0');
    expect(peticion.request.params.get('tamano')).toBe('20');
    // sin fechas: el backend decide el rango (mes en curso) — el front no
    // reimplementa el corte de día calendario en zona Colombia
    expect(peticion.request.params.has('desde')).toBe(false);

    peticion.flush({ ordenes: [], totalElementos: 0, pagina: 0, tamano: 20 });
    expect(respuesta).toEqual({ ordenes: [], totalElementos: 0, pagina: 0, tamano: 20 });
  });

  it('acepta un tamaño de página explícito', () => {
    api.listar({ tamano: 20 }).subscribe();
    const peticion = http.expectOne((req) => req.url === '/api/ventas');
    expect(peticion.request.params.get('tamano')).toBe('20');
    peticion.flush({ ordenes: [], totalElementos: 0, pagina: 0, tamano: 20 });
  });

  it('acepta desde/hasta/pagina para el historial filtrado (HUF-009)', () => {
    api.listar({ desde: '2026-07-01', hasta: '2026-07-15', pagina: 2, tamano: 10 }).subscribe();

    const peticion = http.expectOne((req) => req.url === '/api/ventas');
    expect(peticion.request.params.get('desde')).toBe('2026-07-01');
    expect(peticion.request.params.get('hasta')).toBe('2026-07-15');
    expect(peticion.request.params.get('pagina')).toBe('2');
    expect(peticion.request.params.get('tamano')).toBe('10');
    peticion.flush({ ordenes: [], totalElementos: 0, pagina: 2, tamano: 10 });
  });

  it('consulta el resumen del día y del mes con GET /api/ventas/resumen', () => {
    let respuesta: unknown;
    api.resumen().subscribe((r) => (respuesta = r));

    const peticion = http.expectOne('/api/ventas/resumen');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ dia: { total: 75000, cantidad: 2 }, mes: { total: 320000, cantidad: 9 } });

    expect(respuesta).toEqual({
      dia: { total: 75000, cantidad: 2 },
      mes: { total: 320000, cantidad: 9 },
    });
  });
});
