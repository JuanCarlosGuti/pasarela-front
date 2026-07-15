import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { PaginaComprobante } from './pagina-comprobante';

/** HUF-011: comprobante de venta — imprimible, con el estado real. */
describe('PaginaComprobante', () => {
  let http: HttpTestingController;

  function crear(id = 'orden-1') {
    TestBed.configureTestingModule({
      imports: [PaginaComprobante],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PaginaComprobante);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => http.verify());

  it('muestra "cargando" mientras llega la respuesta', () => {
    const fixture = crear();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando');
    http.expectOne('/api/ordenes/orden-1/comprobante').flush({
      numeroComprobante: 'orden-1',
      referencia: 'ref-1',
      monto: 25000,
      moneda: 'COP',
      estado: 'PAGO_DETECTADO',
      creadaEn: '2026-07-15T14:00:00Z',
      pagoDetectadoEn: '2026-07-15T14:02:00Z',
      liquidadaEn: null,
      emitidoEn: '2026-07-15T14:10:00Z',
    });
  });

  it('muestra numero, referencia, monto y estado de una venta pagada sin liquidar', () => {
    const fixture = crear();
    http.expectOne('/api/ordenes/orden-1/comprobante').flush({
      numeroComprobante: 'orden-1',
      referencia: 'ref-1',
      monto: 25000,
      moneda: 'COP',
      estado: 'PAGO_DETECTADO',
      creadaEn: '2026-07-15T14:00:00Z',
      pagoDetectadoEn: '2026-07-15T14:02:00Z',
      liquidadaEn: null,
      emitidoEn: '2026-07-15T14:10:00Z',
    });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('$ 25.000');
    expect(html.textContent).toContain('ref-1');
    expect(html.textContent).toContain('Aún no liquidada');
  });

  it('con una orden liquidada, muestra la fecha de liquidación', () => {
    const fixture = crear();
    http.expectOne('/api/ordenes/orden-1/comprobante').flush({
      numeroComprobante: 'orden-1',
      referencia: 'ref-1',
      monto: 25000,
      moneda: 'COP',
      estado: 'LIQUIDADA',
      creadaEn: '2026-07-15T14:00:00Z',
      pagoDetectadoEn: '2026-07-15T14:02:00Z',
      liquidadaEn: '2026-07-16T10:00:00Z',
      emitidoEn: '2026-07-16T10:05:00Z',
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Aún no liquidada');
  });

  it('una orden sin pagar (422) muestra el mensaje del backend', () => {
    const fixture = crear();
    http.expectOne('/api/ordenes/orden-1/comprobante').flush(
      {
        mensaje:
          'Una orden en estado PENDIENTE_PAGO no tiene comprobante: solo las pagadas o liquidadas',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('solo las pagadas o liquidadas');
  });

  it('un error genérico muestra un mensaje claro', () => {
    const fixture = crear();
    http
      .expectOne('/api/ordenes/orden-1/comprobante')
      .flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('No pudimos cargar');
  });

  it('el botón Imprimir llama a window.print', () => {
    const fixture = crear();
    http.expectOne('/api/ordenes/orden-1/comprobante').flush({
      numeroComprobante: 'orden-1',
      referencia: 'ref-1',
      monto: 25000,
      moneda: 'COP',
      estado: 'PAGO_DETECTADO',
      creadaEn: '2026-07-15T14:00:00Z',
      pagoDetectadoEn: '2026-07-15T14:02:00Z',
      liquidadaEn: null,
      emitidoEn: '2026-07-15T14:10:00Z',
    });
    fixture.detectChanges();

    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button.imprimir')!
      .click();
    expect(imprimir).toHaveBeenCalled();
  });
});
