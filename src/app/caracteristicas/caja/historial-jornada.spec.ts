import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HistorialJornada } from './historial-jornada';

/** HUF-005: los últimos cobros de la caja, sin salir de la pantalla. */
describe('HistorialJornada', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialJornada],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(HistorialJornada);
    fixture.detectChanges();
    return fixture;
  }

  function responderVentas(fixture: ReturnType<typeof crear>, ordenes: unknown[]) {
    http
      .expectOne((req) => req.url === '/api/ventas')
      .flush({ ordenes, totalElementos: ordenes.length, pagina: 0, tamano: 20 });
    fixture.detectChanges();
  }

  it('muestra "cargando" mientras llega la respuesta', () => {
    const fixture = crear();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando');
    http
      .expectOne((req) => req.url === '/api/ventas')
      .flush({
        ordenes: [],
        totalElementos: 0,
        pagina: 0,
        tamano: 20,
      });
  });

  it('con la jornada vacía, muestra un mensaje amable', () => {
    const fixture = crear();
    responderVentas(fixture, []);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aún no has cobrado hoy');
  });

  it('lista las órdenes con hora, monto y estado inconfundible', () => {
    const fixture = crear();
    responderVentas(fixture, [
      {
        id: 'o1',
        referencia: 'ref-1',
        estado: 'PAGO_DETECTADO',
        monto: 25000,
        creadaEn: '2026-07-15T14:00:00Z',
      },
      {
        id: 'o2',
        referencia: 'ref-2',
        estado: 'PENDIENTE_PAGO',
        monto: 12000,
        creadaEn: '2026-07-15T14:05:00Z',
      },
      {
        id: 'o3',
        referencia: 'ref-3',
        estado: 'EXPIRADA',
        monto: 8000,
        creadaEn: '2026-07-15T14:10:00Z',
      },
    ]);

    const html = fixture.nativeElement as HTMLElement;
    const filas = html.querySelectorAll('li.orden');
    expect(filas.length).toBe(3);
    expect(html.textContent).toContain('$ 25.000');
    expect(html.textContent).toContain('Pagado');
    expect(html.textContent).toContain('Pendiente');
    expect(html.textContent).toContain('Expiró');
  });

  it('si la carga falla, muestra un error claro', () => {
    const fixture = crear();
    http
      .expectOne((req) => req.url === '/api/ventas')
      .flush({ mensaje: 'falló' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No pudimos cargar tus cobros',
    );
  });

  it('al tocar una orden, carga y muestra su detalle con transiciones', () => {
    const fixture = crear();
    responderVentas(fixture, [
      {
        id: 'o1',
        referencia: 'ref-1',
        estado: 'PAGO_DETECTADO',
        monto: 25000,
        creadaEn: '2026-07-15T14:00:00Z',
      },
    ]);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('li.orden button')!.click();
    fixture.detectChanges();

    http
      .expectOne((req) => req.url === '/api/ordenes/o1')
      .flush({
        id: 'o1',
        referencia: 'ref-1',
        estado: 'PAGO_DETECTADO',
        monto: 25000,
        creadaEn: '2026-07-15T14:00:00Z',
        expiraEn: '2026-07-15T14:15:00Z',
        transiciones: [
          { desde: 'CREADA', hacia: 'PENDIENTE_PAGO', momento: '2026-07-15T14:00:01Z' },
          { desde: 'PENDIENTE_PAGO', hacia: 'PAGO_DETECTADO', momento: '2026-07-15T14:02:00Z' },
        ],
      });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('.detalle')?.textContent).toContain('PENDIENTE_PAGO');
    expect(html.querySelector('.detalle')?.textContent).toContain('PAGO_DETECTADO');
  });

  it('cerrar el detalle vuelve a la lista', () => {
    const fixture = crear();
    responderVentas(fixture, [
      {
        id: 'o1',
        referencia: 'ref-1',
        estado: 'PAGO_DETECTADO',
        monto: 25000,
        creadaEn: '2026-07-15T14:00:00Z',
      },
    ]);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('li.orden button')!.click();
    http
      .expectOne((req) => req.url === '/api/ordenes/o1')
      .flush({
        id: 'o1',
        referencia: 'ref-1',
        estado: 'PAGO_DETECTADO',
        monto: 25000,
        creadaEn: '2026-07-15T14:00:00Z',
        expiraEn: '2026-07-15T14:15:00Z',
        transiciones: [],
      });
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('button.cerrar-detalle')!
      .click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.detalle')).toBeNull();
  });
});
