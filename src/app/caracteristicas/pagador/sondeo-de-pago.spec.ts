import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SondeoDePago } from './sondeo-de-pago';

/** HUF-006: mismo patrón de sondeo de la caja (ADR-F003), para el pagador. */
describe('SondeoDePago', () => {
  let sondeo: SondeoDePago;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    sondeo = TestBed.inject(SondeoDePago);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sondeo.detener();
    vi.useRealTimers();
    http.verify();
  });

  it('consulta INMEDIATAMENTE al iniciar (sin esperar el primer intervalo)', () => {
    sondeo.iniciar('ref-1');
    expect(sondeo.resultado()).toBe('cargando');

    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });
    expect(sondeo.resultado()).toBe('esperando');
    expect(sondeo.monto()).toBe(25000);
  });

  it('con PAGO_DETECTADO (o posterior) reporta pagada y deja de consultar', () => {
    sondeo.iniciar('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PAGO_DETECTADO', monto: 25000 });

    expect(sondeo.resultado()).toBe('pagada');

    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/pagos/ref-1');
  });

  it('con EXPIRADA reporta expirada y se detiene', () => {
    sondeo.iniciar('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'EXPIRADA', monto: 25000 });

    expect(sondeo.resultado()).toBe('expirada');
    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/pagos/ref-1');
  });

  it('una referencia inexistente (404) reporta no-existe y se detiene sin reintentar', () => {
    sondeo.iniciar('ref-fantasma');
    http
      .expectOne('/api/pagos/ref-fantasma')
      .flush({ mensaje: 'no existe' }, { status: 404, statusText: 'Not Found' });

    expect(sondeo.resultado()).toBe('no-existe');

    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/pagos/ref-fantasma');
  });

  it('un error de red marca sinConexion y SIGUE intentando', () => {
    sondeo.iniciar('ref-1');
    http.expectOne('/api/pagos/ref-1').error(new ProgressEvent('error'));
    expect(sondeo.sinConexion()).toBe(true);
    expect(sondeo.resultado()).not.toBe('no-existe');

    vi.advanceTimersByTime(2500);
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });
    expect(sondeo.sinConexion()).toBe(false);
  });

  it('sigue consultando cada 2.5s mientras el pago esté pendiente', () => {
    sondeo.iniciar('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });

    vi.advanceTimersByTime(2500);
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });
    expect(sondeo.resultado()).toBe('esperando');
  });

  it('detener() para el sondeo', () => {
    sondeo.iniciar('ref-1');
    http.expectOne('/api/pagos/ref-1').flush({ estado: 'PENDIENTE_PAGO', monto: 25000 });
    sondeo.detener();

    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/pagos/ref-1');
  });
});
