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
    };
  }

  function responder(comercios: unknown[]) {
    http.expectOne((req) => req.url === '/api/comercios').flush(comercios);
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
});
