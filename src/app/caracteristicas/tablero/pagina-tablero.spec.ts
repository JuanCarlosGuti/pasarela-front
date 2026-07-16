import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaginaTablero } from './pagina-tablero';

/**
 * HUF-008: ventas de hoy y del mes, en tarjetas grandes. Desde HUF-009 la
 * página también incluye <app-historial-de-ventas>, que dispara su propia
 * consulta a GET /api/ventas — se responde vacía en cada prueba para no
 * dejar peticiones abiertas (HistorialDeVentas tiene sus propias pruebas).
 */
describe('PaginaTablero — resumen', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaTablero],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(PaginaTablero);
    fixture.detectChanges();
    return fixture;
  }

  function responderHistorialVacio() {
    http
      .expectOne((req) => req.url === '/api/ventas')
      .flush({ ordenes: [], totalElementos: 0, pagina: 0, tamano: 20 });
  }

  function responderLiquidacionesVacias() {
    http.expectOne((req) => req.url === '/api/liquidaciones').flush([]);
  }

  it('muestra "cargando" mientras llega la respuesta', () => {
    const fixture = crear();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando');
    http
      .expectOne('/api/ventas/resumen')
      .flush({ dia: { total: 0, cantidad: 0 }, mes: { total: 0, cantidad: 0 } });
    responderHistorialVacio();
    responderLiquidacionesVacias();
  });

  it('muestra el total y la cantidad de hoy y del mes, formateados', () => {
    const fixture = crear();
    http.expectOne('/api/ventas/resumen').flush({
      dia: { total: 75000, cantidad: 2 },
      mes: { total: 320000, cantidad: 9 },
    });
    responderHistorialVacio();
    responderLiquidacionesVacias();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('$ 75.000');
    expect(html.textContent).toContain('2');
    expect(html.textContent).toContain('$ 320.000');
    expect(html.textContent).toContain('9');
  });

  it('si la carga falla, muestra un error con opción de reintentar', () => {
    const fixture = crear();
    http.expectOne('/api/ventas/resumen').flush({}, { status: 500, statusText: 'Error' });
    responderHistorialVacio();
    responderLiquidacionesVacias();
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('No pudimos cargar');

    html.querySelector<HTMLButtonElement>('button.reintentar')!.click();
    http.expectOne('/api/ventas/resumen').flush({
      dia: { total: 10000, cantidad: 1 },
      mes: { total: 10000, cantidad: 1 },
    });
    fixture.detectChanges();
    expect(html.querySelector('[role="alert"]')).toBeNull();
  });

  it('al volver a la pestaña, vuelve a consultar el resumen', () => {
    const fixture = crear();
    http.expectOne('/api/ventas/resumen').flush({
      dia: { total: 75000, cantidad: 2 },
      mes: { total: 320000, cantidad: 9 },
    });
    responderHistorialVacio();
    responderLiquidacionesVacias();
    fixture.detectChanges();

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    http.expectOne('/api/ventas/resumen').flush({
      dia: { total: 90000, cantidad: 3 },
      mes: { total: 330000, cantidad: 10 },
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('$ 90.000');
  });

  it('destruir la pantalla deja de escuchar el evento (sin fugas)', () => {
    const fixture = crear();
    http.expectOne('/api/ventas/resumen').flush({
      dia: { total: 75000, cantidad: 2 },
      mes: { total: 320000, cantidad: 9 },
    });
    responderHistorialVacio();
    responderLiquidacionesVacias();
    fixture.destroy();

    document.dispatchEvent(new Event('visibilitychange'));
    http.expectNone('/api/ventas/resumen');
  });
});
