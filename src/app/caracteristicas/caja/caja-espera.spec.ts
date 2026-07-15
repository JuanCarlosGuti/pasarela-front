import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CajaService } from './caja.service';

/** HUF-004: la espera del pago — sondeo, cuenta regresiva y desenlaces. */
describe('CajaService — la espera (HUF-004)', () => {
  let caja: CajaService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    caja = TestBed.inject(CajaService);
    http = TestBed.inject(HttpTestingController);
    caja.limpiar();
  });

  afterEach(() => {
    caja.suspender();
    vi.useRealTimers();
    http.verify();
  });

  function cobrarYEsperar() {
    for (const d of '25000') {
      caja.digitar(d);
    }
    caja.cobrar();
    http.expectOne('/api/ordenes').flush({
      id: 'orden-1',
      referencia: 'ref-1',
      estado: 'PENDIENTE_PAGO',
      monto: 25000,
      expiraEn: new Date(Date.now() + 90_000).toISOString(),
      qr: { contenido: 'PAGOSIM|ref-1|25000', deeplink: 'pasarela-sim://pagar/ref-1' },
    });
    expect(caja.fase()).toBe('esperando');
  }

  it('cuando el sondeo detecta el pago, la fase pasa a PAGADA con la hora', () => {
    cobrarYEsperar();

    vi.advanceTimersByTime(2500);
    http.expectOne('/api/ordenes/orden-1').flush({ id: 'orden-1', estado: 'PAGO_DETECTADO' });

    expect(caja.fase()).toBe('pagada');
    expect(caja.horaDePago()).not.toBe('');

    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/ordenes/orden-1'); // todo detenido
  });

  it('cuando expira, la fase pasa a EXPIRADA y volver a cobrar precarga el monto', () => {
    cobrarYEsperar();

    vi.advanceTimersByTime(2500);
    http.expectOne('/api/ordenes/orden-1').flush({ id: 'orden-1', estado: 'EXPIRADA' });
    expect(caja.fase()).toBe('expirada');

    caja.volverACobrar();
    expect(caja.fase()).toBe('digitando');
    expect(caja.monto()).toBe(25000); // el criterio: mismo monto listo

    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/ordenes/orden-1');
  });

  it('la cuenta regresiva pinta m:ss y avanza con el reloj', () => {
    cobrarYEsperar();
    expect(caja.cuentaRegresiva()).toBe('1:30');

    vi.advanceTimersByTime(61_000);
    // el sondeo también corrió: responder lo pendiente para cerrar limpio
    http.match('/api/ordenes/orden-1').forEach((consulta) => {
      consulta.flush({ id: 'orden-1', estado: 'PENDIENTE_PAGO' });
    });

    expect(caja.cuentaRegresiva()).toBe('0:29');
  });

  it('suspender (salir de la pantalla) detiene el sondeo; reanudar lo retoma', () => {
    cobrarYEsperar();

    caja.suspender();
    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/ordenes/orden-1');

    caja.reanudar();
    vi.advanceTimersByTime(2500);
    http.expectOne('/api/ordenes/orden-1').flush({ id: 'orden-1', estado: 'PENDIENTE_PAGO' });
    expect(caja.fase()).toBe('esperando');
  });
});
