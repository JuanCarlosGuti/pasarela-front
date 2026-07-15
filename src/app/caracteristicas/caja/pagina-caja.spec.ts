import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaginaCaja } from './pagina-caja';
import { CajaService } from './caja.service';

describe('PaginaCaja (HUF-003)', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaCaja],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(CajaService).limpiar(); // providedIn root: estado limpio por prueba
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(PaginaCaja);
    fixture.detectChanges();
    return fixture;
  }

  function tocar(html: HTMLElement, texto: string) {
    const boton = Array.from(html.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    );
    expect(boton, `no existe el botón ${texto}`).toBeTruthy();
    boton!.click();
  }

  it('el teclado arma el monto y lo muestra formateado', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;

    for (const d of ['2', '5', '0', '0', '0']) {
      tocar(html, d);
    }
    fixture.detectChanges();

    expect(html.textContent).toContain('$ 25.000');
  });

  it('COBRAR está deshabilitado con monto en cero', () => {
    const html = crear().nativeElement as HTMLElement;
    const cobrar = Array.from(html.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('COBRAR'),
    )!;
    expect(cobrar.disabled).toBe(true);
  });

  it('al cobrar muestra la pantalla de espera con monto, referencia y deeplink', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    for (const d of ['7', '5', '0', '0']) {
      tocar(html, d);
    }
    fixture.detectChanges();
    tocar(html, 'COBRAR');
    fixture.detectChanges();

    expect(html.textContent).toContain('Creando cobro');

    http.expectOne('/api/ordenes').flush({
      id: 'orden-9',
      referencia: 'ref-9',
      estado: 'PENDIENTE_PAGO',
      monto: 7500,
      expiraEn: '2026-07-15T15:00:00Z',
      qr: { contenido: 'PAGOSIM|ref-9|7500', deeplink: 'pasarela-sim://pagar/ref-9' },
    });
    fixture.detectChanges();

    expect(html.textContent).toContain('$ 7.500');
    expect(html.textContent).toContain('ref-9');
    const deeplink = html.querySelector<HTMLAnchorElement>('a.deeplink');
    expect(deeplink?.getAttribute('href')).toBe('pasarela-sim://pagar/ref-9');
  });

  it('un 422 del backend se muestra como alerta y el monto queda para corregir', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    for (const d of ['9', '9', '9']) {
      tocar(html, d);
    }
    fixture.detectChanges();
    tocar(html, 'COBRAR');

    http
      .expectOne('/api/ordenes')
      .flush(
        { mensaje: 'El cobro supera el tope por transacción' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('tope por transacción');
    expect(html.textContent).toContain('$ 999');
  });

  it('Ver cobros de hoy muestra el historial sin perder el teclado (HUF-005)', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    tocar(html, '5');
    fixture.detectChanges();

    tocar(html, 'Ver cobros de hoy');
    fixture.detectChanges();
    http
      .expectOne((req) => req.url === '/api/ventas')
      .flush({
        ordenes: [],
        totalElementos: 0,
        pagina: 0,
        tamano: 20,
      });
    fixture.detectChanges();

    expect(html.textContent).toContain('Cobros de hoy');
    expect(html.querySelector('.teclado')).toBeNull();

    tocar(html, 'Volver a cobrar');
    fixture.detectChanges();

    expect(html.querySelector('.teclado')).not.toBeNull();
    expect(html.textContent).toContain('$ 5'); // el monto no se perdió
  });
});
