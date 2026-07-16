import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LiquidacionesSimuladas } from './liquidaciones-simuladas';

/** HUF-014: liquidaciones simuladas — SOLO SIMULACIÓN (HU-025 del backend). */
describe('LiquidacionesSimuladas', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LiquidacionesSimuladas],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(LiquidacionesSimuladas);
    fixture.detectChanges();
    return fixture;
  }

  it('con la lista vacía, muestra un mensaje amable', () => {
    const fixture = crear();
    http.expectOne('/api/liquidaciones').flush([]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Aún no tienes liquidaciones',
    );
  });

  it('muestra el desglose completo de cada liquidación, con la etiqueta "Simulado"', () => {
    const fixture = crear();
    http.expectOne('/api/liquidaciones').flush([
      {
        id: 'liq-1',
        comercioId: 'com-1',
        ordenes: ['ord-1', 'ord-2'],
        montoBruto: 100000,
        comisionPlataforma: 2500,
        comisionRampa: 800,
        tasaCambioSimulada: 4150,
        cuentaDestinoDescripcion: 'NEQUI ••••4567 — Doña Rosa',
        montoNetoComercio: 96700,
        referenciaProveedor: 'RAMPA-SIM-ABC12345',
        estado: 'REGISTRADA',
        detalleDiscrepancia: null,
        liquidadaEn: '2026-07-15T14:00:00Z',
      },
    ]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('$ 100.000');
    expect(html.textContent).toContain('$ 800');
    expect(html.textContent).toContain('4150');
    expect(html.textContent).toContain('$ 2.500');
    expect(html.textContent).toContain('$ 96.700');
    expect(html.textContent).toContain('NEQUI ••••4567 — Doña Rosa');
    expect(html.textContent).toContain('Simulado');
  });

  it('un error de red muestra un mensaje claro', () => {
    const fixture = crear();
    http.expectOne('/api/liquidaciones').flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('No pudimos cargar');
  });
});
