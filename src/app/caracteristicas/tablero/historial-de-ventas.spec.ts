import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HistorialDeVentas } from './historial-de-ventas';

/** HUF-009: historial paginado con filtros de fecha, del tablero. */
describe('HistorialDeVentas', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialDeVentas],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(HistorialDeVentas);
    fixture.detectChanges();
    return fixture;
  }

  function responder(ordenes: unknown[], totalElementos = ordenes.length, pagina = 0) {
    http
      .expectOne((req) => req.url === '/api/ventas')
      .flush({ ordenes, totalElementos, pagina, tamano: 20 });
  }

  it('carga la primera página al iniciar, sin fechas', () => {
    const fixture = crear();
    const peticion = http.expectOne((req) => req.url === '/api/ventas');
    expect(peticion.request.params.get('pagina')).toBe('0');
    expect(peticion.request.params.has('desde')).toBe(false);
    peticion.flush({ ordenes: [], totalElementos: 0, pagina: 0, tamano: 20 });
    fixture.detectChanges();
  });

  it('con la lista vacía, muestra un mensaje amable', () => {
    const fixture = crear();
    responder([]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay movimientos en este rango',
    );
  });

  it('muestra cada orden como tarjeta (móvil) y como fila de tabla (escritorio)', () => {
    const fixture = crear();
    responder([
      {
        id: 'o1',
        referencia: 'ref-1',
        estado: 'PAGO_DETECTADO',
        monto: 25000,
        creadaEn: '2026-07-15T14:00:00Z',
      },
    ]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelectorAll('.tarjetas-movil li').length).toBe(1);
    expect(html.querySelectorAll('table tbody tr').length).toBe(1);
    expect(html.textContent).toContain('$ 25.000');
    expect(html.textContent).toContain('Pagado');
  });

  it('filtrar por fechas envía desde/hasta y vuelve a la página 0', () => {
    const fixture = crear();
    responder([]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const desde = html.querySelector<HTMLInputElement>('input[name="desde"]')!;
    const hasta = html.querySelector<HTMLInputElement>('input[name="hasta"]')!;
    desde.value = '2026-07-01';
    desde.dispatchEvent(new Event('input'));
    hasta.value = '2026-07-15';
    hasta.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('button.filtrar')!.click();

    const peticion = http.expectOne((req) => req.url === '/api/ventas');
    expect(peticion.request.params.get('desde')).toBe('2026-07-01');
    expect(peticion.request.params.get('hasta')).toBe('2026-07-15');
    expect(peticion.request.params.get('pagina')).toBe('0');
    peticion.flush({ ordenes: [], totalElementos: 0, pagina: 0, tamano: 20 });
  });

  it('un rango inválido (400) muestra el mensaje del backend', () => {
    const fixture = crear();
    responder([]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.filtrar')!.click();
    http
      .expectOne((req) => req.url === '/api/ventas')
      .flush(
        { mensaje: "El rango de fechas es inválido: 'desde' es posterior a 'hasta'" },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('es posterior a');
  });

  it('descargar CSV pide el export con los filtros vigentes y dispara la descarga (HUF-010)', () => {
    const fixture = crear();
    responder([]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const desde = html.querySelector<HTMLInputElement>('input[name="desde"]')!;
    desde.value = '2026-07-01';
    desde.dispatchEvent(new Event('input'));

    const urlFalsa = 'blob:falso';
    const crearUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue(urlFalsa);
    const revocarUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clicEnlace = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    html.querySelector<HTMLButtonElement>('button.descargar-csv')!.click();

    const peticion = http.expectOne((req) => req.url === '/api/ventas/exportar');
    expect(peticion.request.params.get('desde')).toBe('2026-07-01');
    expect(peticion.request.responseType).toBe('blob');
    const csv = new Blob(['contenido'], { type: 'text/csv' });
    peticion.flush(csv);

    expect(crearUrl).toHaveBeenCalledWith(csv);
    expect(clicEnlace).toHaveBeenCalled();
    expect(revocarUrl).toHaveBeenCalledWith(urlFalsa);
  });

  it('si la descarga falla, muestra un error claro', () => {
    const fixture = crear();
    responder([]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.descargar-csv')!.click();

    http
      .expectOne((req) => req.url === '/api/ventas/exportar')
      .flush(new Blob(), { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('No pudimos generar');
  });

  it('Siguiente pide la página 1; Anterior deshabilitado en la primera página', () => {
    const fixture = crear();
    responder(
      Array.from({ length: 20 }, (_, i) => ({
        id: `o${i}`,
        referencia: `ref-${i}`,
        estado: 'PAGO_DETECTADO',
        monto: 1000,
        creadaEn: '2026-07-15T14:00:00Z',
      })),
      45,
      0,
    );
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector<HTMLButtonElement>('button.anterior')!.disabled).toBe(true);

    html.querySelector<HTMLButtonElement>('button.siguiente')!.click();
    const peticion = http.expectOne((req) => req.url === '/api/ventas');
    expect(peticion.request.params.get('pagina')).toBe('1');
    peticion.flush({ ordenes: [], totalElementos: 45, pagina: 1, tamano: 20 });
  });
});
