import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaginaCaja } from './pagina-caja';
import { CajaService } from './caja.service';

/** HUF-004: las pantallas de la espera y sus desenlaces. */
describe('PaginaCaja — espera, PAGADO y expiración (HUF-004)', () => {
  let http: HttpTestingController;
  let caja: CajaService;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await TestBed.configureTestingModule({
      imports: [PaginaCaja],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    caja = TestBed.inject(CajaService);
    caja.limpiar();
  });

  afterEach(() => {
    caja.suspender();
    vi.useRealTimers();
    http.verify();
  });

  function crearYCobrar() {
    const fixture = TestBed.createComponent(PaginaCaja);
    fixture.detectChanges();
    for (const d of '18000') {
      caja.digitar(d);
    }
    caja.cobrar();
    http.expectOne('/api/ordenes').flush({
      id: 'orden-7',
      referencia: 'ref-7',
      estado: 'PENDIENTE_PAGO',
      monto: 18000,
      expiraEn: new Date(Date.now() + 90_000).toISOString(),
      qr: { contenido: 'PAGOSIM|ref-7|18000', deeplink: 'pasarela-sim://pagar/ref-7' },
    });
    fixture.detectChanges();
    return fixture;
  }

  it('la espera muestra el QR como imagen SVG generada localmente', async () => {
    const fixture = crearYCobrar();
    await fixture.whenStable(); // la generación del SVG es una promesa
    fixture.detectChanges();

    const qr = (fixture.nativeElement as HTMLElement).querySelector('.qr-imagen');
    expect(qr?.innerHTML).toContain('<svg');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Expira en 1:');
  });

  it('cuando el backend confirma el pago, aparece PAGADO ✓ anunciado con aria-live', () => {
    const fixture = crearYCobrar();

    vi.advanceTimersByTime(2500);
    http.expectOne('/api/ordenes/orden-7').flush({ id: 'orden-7', estado: 'PAGO_DETECTADO' });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const pantalla = html.querySelector('.pagada');
    expect(pantalla?.getAttribute('aria-live')).toBe('assertive');
    expect(pantalla?.textContent).toContain('PAGADO');
    expect(pantalla?.textContent).toContain('$ 18.000');
  });

  it('cuando expira, ofrece volver a cobrar con el monto precargado', () => {
    const fixture = crearYCobrar();

    vi.advanceTimersByTime(2500);
    http.expectOne('/api/ordenes/orden-7').flush({ id: 'orden-7', estado: 'EXPIRADA' });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('El cobro expiró');

    const boton = Array.from(html.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Volver a cobrar'),
    )!;
    boton.click();
    fixture.detectChanges();

    expect(html.textContent).toContain('$ 18.000'); // el monto sigue listo
    expect(caja.fase()).toBe('digitando');
  });

  it('destruir la pantalla detiene el sondeo (sin fugas al navegar)', () => {
    const fixture = crearYCobrar();

    fixture.destroy();
    vi.advanceTimersByTime(10_000);

    http.expectNone('/api/ordenes/orden-7');
  });
});
