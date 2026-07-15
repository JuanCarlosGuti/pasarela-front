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
    api.listar(20).subscribe();
    const peticion = http.expectOne((req) => req.url === '/api/ventas');
    expect(peticion.request.params.get('tamano')).toBe('20');
    peticion.flush({ ordenes: [], totalElementos: 0, pagina: 0, tamano: 20 });
  });
});
