import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { PaginaPagador } from './pagina-pagador';
import { SondeoDePago } from './sondeo-de-pago';

describe('PaginaPagador (HUF-006)', () => {
  let http: HttpTestingController;

  function crear(referencia: string) {
    TestBed.configureTestingModule({
      imports: [PaginaPagador],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ referencia })) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PaginaPagador);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    TestBed.inject(SondeoDePago).detener();
    http.verify();
  });

  it('mientras carga, muestra un estado de espera', () => {
    const fixture = crear('ref-1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });
  });

  it('con el pago pendiente, muestra el monto y que sigue esperando', () => {
    const fixture = crear('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('$ 25.000');
    expect(html.textContent.toLowerCase()).toContain('esperando');
  });

  it('cuando el pago se confirma, muestra PAGADO ✓ con aria-live', () => {
    const fixture = crear('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PAGO_DETECTADO', monto: 25000 });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const pantalla = html.querySelector('.pagada');
    expect(pantalla?.getAttribute('aria-live')).toBe('assertive');
    expect(pantalla?.textContent).toContain('PAGADO');
  });

  it('cuando expira, lo muestra inconfundible', () => {
    const fixture = crear('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'EXPIRADA', monto: 25000 });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('expiró');
  });

  it('una referencia inexistente muestra "Este pago no existe"', () => {
    const fixture = crear('ref-fantasma');
    http
      .expectOne('/api/pagos/ref-fantasma')
      .flush({ mensaje: 'no existe' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Este pago no existe');
  });

  it('destruir la pantalla detiene el sondeo (sin fugas)', () => {
    const fixture = crear('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });

    fixture.destroy();
    // el intervalo ya no dispara nuevas consultas
    http.verify();
  });
});
