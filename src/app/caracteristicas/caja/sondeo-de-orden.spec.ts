import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SondeoDeOrden } from './sondeo-de-orden';

/** ADR-F003: polling de 2.5 s que jamás revienta la UI. */
describe('SondeoDeOrden (HUF-004)', () => {
  let sondeo: SondeoDeOrden;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    sondeo = TestBed.inject(SondeoDeOrden);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sondeo.detener();
    vi.useRealTimers();
    http.verify();
  });

  function responder(estado: string) {
    http.expectOne('/api/ordenes/orden-1').flush({ id: 'orden-1', estado });
  }

  it('consulta cada 2.5s mientras la orden siga pendiente', () => {
    sondeo.iniciar('orden-1');
    expect(sondeo.resultado()).toBe('esperando');

    vi.advanceTimersByTime(2500);
    responder('PENDIENTE_PAGO');
    expect(sondeo.resultado()).toBe('esperando');

    vi.advanceTimersByTime(2500);
    responder('PENDIENTE_PAGO');
    expect(sondeo.resultado()).toBe('esperando');
  });

  it('con PAGO_DETECTADO (o posterior) reporta pagada y DEJA de consultar', () => {
    sondeo.iniciar('orden-1');
    vi.advanceTimersByTime(2500);
    responder('PAGO_DETECTADO');

    expect(sondeo.resultado()).toBe('pagada');

    vi.advanceTimersByTime(10000);
    http.expectNone('/api/ordenes/orden-1'); // se detuvo solo
  });

  it('CONVERTIDA y LIQUIDADA también cuentan como pagada (venta efectiva)', () => {
    sondeo.iniciar('orden-1');
    vi.advanceTimersByTime(2500);
    responder('CONVERTIDA');
    expect(sondeo.resultado()).toBe('pagada');
  });

  it('con EXPIRADA reporta expirada y se detiene', () => {
    sondeo.iniciar('orden-1');
    vi.advanceTimersByTime(2500);
    responder('EXPIRADA');

    expect(sondeo.resultado()).toBe('expirada');
    vi.advanceTimersByTime(10000);
    http.expectNone('/api/ordenes/orden-1');
  });

  it('una caída de red marca sinConexion y SIGUE intentando; al volver se limpia', () => {
    sondeo.iniciar('orden-1');

    vi.advanceTimersByTime(2500);
    http.expectOne('/api/ordenes/orden-1').error(new ProgressEvent('error'));
    expect(sondeo.sinConexion()).toBe(true);
    expect(sondeo.resultado()).toBe('esperando'); // la UI no revienta

    vi.advanceTimersByTime(2500);
    responder('PENDIENTE_PAGO');
    expect(sondeo.sinConexion()).toBe(false);
  });

  it('detener() para el sondeo (salir de la pantalla no deja fugas)', () => {
    sondeo.iniciar('orden-1');
    sondeo.detener();

    vi.advanceTimersByTime(10000);
    http.expectNone('/api/ordenes/orden-1');
  });

  it('no consulta en paralelo: si una respuesta tarda, no apila otra', () => {
    sondeo.iniciar('orden-1');
    vi.advanceTimersByTime(2500);
    // la primera consulta sigue abierta (sin flush) y pasan más ticks:
    vi.advanceTimersByTime(5000);

    const pendientes = http.match('/api/ordenes/orden-1');
    expect(pendientes.length).toBe(1); // una sola en vuelo
    pendientes[0].flush({ id: 'orden-1', estado: 'PENDIENTE_PAGO' });
  });
});
