import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PaginaAdmin } from './pagina-admin';

/** HUF-012: verificación de comercios — la cola del admin. */
describe('PaginaAdmin', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaAdmin],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(PaginaAdmin);
    fixture.detectChanges();
    return fixture;
  }

  function comercio(id: string, estado = 'PENDIENTE') {
    return {
      id,
      razonSocial: `Tienda ${id}`,
      nit: '900650321-2',
      estadoVerificacion: estado,
      registradoEn: '2026-07-16T10:00:00Z',
      limites: { topePorTransaccion: 2000000, topeMensual: 20000000 },
    };
  }

  function responder(comercios: unknown[], totalElementos = comercios.length) {
    http
      .expectOne((req) => req.url === '/api/comercios')
      .flush({ comercios, totalElementos, pagina: 0, tamano: 20 });
  }

  it('carga la cola al iniciar y muestra cada comercio con su estado', () => {
    const fixture = crear();
    responder([comercio('c1', 'PENDIENTE'), comercio('c2', 'VERIFICADO')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Tienda c1');
    expect(html.textContent).toContain('Pendiente');
    expect(html.textContent).toContain('Tienda c2');
    expect(html.textContent).toContain('Verificado');
  });

  it('con la cola vacía, muestra un mensaje amable', () => {
    const fixture = crear();
    responder([]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay comercios en este estado',
    );
  });

  it('filtrar por estado vuelve a pedir la lista con ?estado=', () => {
    const fixture = crear();
    responder([]);
    fixture.detectChanges();

    const selector = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      'select[name="filtro"]',
    )!;
    selector.value = 'PENDIENTE';
    selector.dispatchEvent(new Event('change'));

    const peticion = http.expectOne((req) => req.url === '/api/comercios');
    expect(peticion.request.params.get('estado')).toBe('PENDIENTE');
    peticion.flush([]);
  });

  it('aprobar pide confirmación y solo al confirmar envía la decisión', () => {
    const fixture = crear();
    responder([comercio('c1')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.aprobar')!.click();
    fixture.detectChanges();

    // todavía no hay POST: primero la confirmación
    expect(html.textContent).toContain('¿Aprobar a Tienda c1?');

    html.querySelector<HTMLButtonElement>('button.confirmar')!.click();
    const peticion = http.expectOne('/api/comercios/c1/verificacion');
    expect(peticion.request.body).toEqual({ decision: 'APROBAR', motivo: null });
    peticion.flush(comercio('c1', 'VERIFICADO'));
    fixture.detectChanges();

    // la fila se actualiza en el sitio, sin recargar la lista
    expect(html.textContent).toContain('Verificado');
  });

  it('cancelar la confirmación no envía nada', () => {
    const fixture = crear();
    responder([comercio('c1')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.aprobar')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('button.cancelar')!.click();
    fixture.detectChanges();

    expect(html.textContent).not.toContain('¿Aprobar');
    http.expectNone('/api/comercios/c1/verificacion');
  });

  it('rechazar exige motivo: sin él no se puede confirmar; con él, viaja al backend', () => {
    const fixture = crear();
    responder([comercio('c1')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.rechazar')!.click();
    fixture.detectChanges();

    const confirmar = html.querySelector<HTMLButtonElement>('button.confirmar')!;
    expect(confirmar.disabled).toBe(true);

    const motivo = html.querySelector<HTMLInputElement>('input[name="motivo"]')!;
    motivo.value = 'Documentos ilegibles';
    motivo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmar.disabled).toBe(false);

    confirmar.click();
    const peticion = http.expectOne('/api/comercios/c1/verificacion');
    expect(peticion.request.body).toEqual({
      decision: 'RECHAZAR',
      motivo: 'Documentos ilegibles',
    });
    peticion.flush(comercio('c1', 'RECHAZADO'));
  });

  it('un 409 del backend (transición inválida) se muestra tal cual', () => {
    const fixture = crear();
    responder([comercio('c1')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.aprobar')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('button.confirmar')!.click();

    http
      .expectOne('/api/comercios/c1/verificacion')
      .flush(
        { mensaje: 'Solo un comercio PENDIENTE puede aprobarse (estado actual: VERIFICADO)' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'Solo un comercio PENDIENTE puede aprobarse',
    );
  });

  it('si la carga de la lista falla, muestra un error claro', () => {
    const fixture = crear();
    http
      .expectOne((req) => req.url === '/api/comercios')
      .flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('No pudimos cargar');
  });

  it('pagina de a 10, y Siguiente pide la página 1 (HUF-016/018)', () => {
    const fixture = crear();
    responder(
      Array.from({ length: 10 }, (_, i) => comercio(`c${i}`)),
      45,
    );
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector<HTMLButtonElement>('button.anterior')!.disabled).toBe(true);

    html.querySelector<HTMLButtonElement>('button.siguiente')!.click();
    const peticion = http.expectOne((req) => req.url === '/api/comercios');
    expect(peticion.request.params.get('pagina')).toBe('1');
    expect(peticion.request.params.get('tamano')).toBe('10');
    peticion.flush({ comercios: [], totalElementos: 45, pagina: 1, tamano: 10 });
  });

  it('la fila muestra los topes vigentes del comercio (HUF-013)', () => {
    const fixture = crear();
    responder([comercio('c1', 'VERIFICADO')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('$ 2.000.000');
    expect(html.textContent).toContain('$ 20.000.000');
  });

  it('el editor de límites precarga los topes vigentes y guarda con PUT (HUF-013)', async () => {
    const fixture = crear();
    responder([comercio('c1', 'VERIFICADO')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.limites')!.click();
    fixture.detectChanges();
    // ngModel escribe el valor en un microtask: hay que esperar a que asiente
    await fixture.whenStable();

    const porTransaccion = html.querySelector<HTMLInputElement>(
      'input[name="topePorTransaccion"]',
    )!;
    const mensual = html.querySelector<HTMLInputElement>('input[name="topeMensual"]')!;
    expect(porTransaccion.value).toBe('2000000');
    expect(mensual.value).toBe('20000000');

    porTransaccion.value = '500000';
    porTransaccion.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    html.querySelector<HTMLButtonElement>('button.guardar')!.click();
    const peticion = http.expectOne('/api/comercios/c1/limites');
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.body).toEqual({ topePorTransaccion: 500000, topeMensual: 20000000 });
    peticion.flush({
      ...comercio('c1', 'VERIFICADO'),
      limites: { topePorTransaccion: 500000, topeMensual: 20000000 },
    });
    fixture.detectChanges();

    // confirmación del cambio: la fila muestra el tope nuevo y el editor se cierra
    expect(html.textContent).toContain('$ 500.000');
    expect(html.querySelector('input[name="topePorTransaccion"]')).toBeNull();
  });

  it('con un tope no positivo, guardar queda deshabilitado (HUF-013)', () => {
    const fixture = crear();
    responder([comercio('c1', 'VERIFICADO')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.limites')!.click();
    fixture.detectChanges();

    const porTransaccion = html.querySelector<HTMLInputElement>(
      'input[name="topePorTransaccion"]',
    )!;
    porTransaccion.value = '0';
    porTransaccion.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(html.querySelector<HTMLButtonElement>('button.guardar')!.disabled).toBe(true);
  });

  it('un 400 del backend (tope por transacción mayor al mensual) se muestra tal cual (HUF-013)', () => {
    const fixture = crear();
    responder([comercio('c1', 'VERIFICADO')]);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    html.querySelector<HTMLButtonElement>('button.limites')!.click();
    fixture.detectChanges();

    const porTransaccion = html.querySelector<HTMLInputElement>(
      'input[name="topePorTransaccion"]',
    )!;
    porTransaccion.value = '30000000';
    porTransaccion.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    html.querySelector<HTMLButtonElement>('button.guardar')!.click();
    http
      .expectOne('/api/comercios/c1/limites')
      .flush(
        { mensaje: 'El tope por transacción no puede superar el tope mensual' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'no puede superar el tope mensual',
    );
  });
});
