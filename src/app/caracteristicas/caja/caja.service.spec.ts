import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CajaService } from './caja.service';

describe('CajaService (HUF-003: crear un cobro)', () => {
  let caja: CajaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    caja = TestBed.inject(CajaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('digitar el monto', () => {
    it('arma el monto dígito a dígito y lo formatea en COP', () => {
      caja.digitar('2');
      caja.digitar('5');
      caja.digitar('0');
      caja.digitar('0');
      caja.digitar('0');

      expect(caja.monto()).toBe(25000);
      expect(caja.montoFormateado()).toBe('$ 25.000');
    });

    it('no acepta ceros a la izquierda ni más de 9 dígitos', () => {
      caja.digitar('0');
      expect(caja.monto()).toBe(0);

      for (const d of '123456789123') {
        caja.digitar(d);
      }
      expect(String(caja.monto()).length).toBeLessThanOrEqual(9);
    });

    it('borrar quita el último dígito y limpiar deja todo en cero', () => {
      caja.digitar('7');
      caja.digitar('5');
      caja.borrar();
      expect(caja.monto()).toBe(7);

      caja.limpiar();
      expect(caja.monto()).toBe(0);
      expect(caja.fase()).toBe('digitando');
    });
  });

  describe('cobrar', () => {
    function digitarMonto() {
      for (const d of '25000') {
        caja.digitar(d);
      }
    }

    it('con monto válido crea la orden y pasa a esperar el pago con el QR', () => {
      digitarMonto();
      caja.cobrar();
      expect(caja.fase()).toBe('creando');

      http.expectOne('/api/ordenes').flush({
        id: 'orden-1',
        referencia: 'ref-1',
        estado: 'PENDIENTE_PAGO',
        monto: 25000,
        expiraEn: '2026-07-15T15:00:00Z',
        qr: { contenido: 'PAGOSIM|ref-1|25000', deeplink: 'pasarela-sim://pagar/ref-1' },
      });

      expect(caja.fase()).toBe('esperando');
      expect(caja.orden()?.qr.contenido).toBe('PAGOSIM|ref-1|25000');
    });

    it('con monto en cero no llama al backend', () => {
      caja.cobrar();
      http.expectNone('/api/ordenes');
      expect(caja.fase()).toBe('digitando');
    });

    it('un 422 por límites muestra el mensaje del backend y permite corregir', () => {
      digitarMonto();
      caja.cobrar();
      http
        .expectOne('/api/ordenes')
        .flush(
          { mensaje: 'El cobro supera el tope por transacción del comercio' },
          { status: 422, statusText: 'Unprocessable Entity' },
        );

      expect(caja.fase()).toBe('digitando');
      expect(caja.error()).toContain('tope por transacción');
      expect(caja.monto()).toBe(25000); // el monto NO se pierde: se corrige
    });

    it('un 502 (proveedor caído) invita a reintentar sin perder el monto', () => {
      digitarMonto();
      caja.cobrar();
      http.expectOne('/api/ordenes').flush({}, { status: 502, statusText: 'Bad Gateway' });

      expect(caja.fase()).toBe('digitando');
      expect(caja.error()).toContain('Reintenta');
      expect(caja.monto()).toBe(25000);
    });
  });
});
