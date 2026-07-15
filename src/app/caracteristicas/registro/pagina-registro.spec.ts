import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PaginaRegistro } from './pagina-registro';

describe('PaginaRegistro (HUF-007)', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaRegistro],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(PaginaRegistro);
    fixture.detectChanges();
    return fixture;
  }

  function llenar(html: HTMLElement, valores: Record<string, string>) {
    for (const [nombre, valor] of Object.entries(valores)) {
      const campo = html.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${nombre}"]`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      campo.dispatchEvent(new Event('change'));
    }
  }

  function enviar(html: HTMLElement) {
    html.querySelector('form')!.dispatchEvent(new Event('submit'));
  }

  const datosValidos = {
    razonSocial: 'Café Central',
    nit: '900650321-2',
    tipo: 'NEQUI',
    numero: '3001234567',
    titular: 'Café Central',
    email: 'ana@cafe.co',
    contrasena: 'secreta-12345678',
  };

  it('tiene labels reales para todos los campos requeridos', () => {
    const html = crear().nativeElement as HTMLElement;
    const etiquetas = Array.from(html.querySelectorAll('label'))
      .map((l) => l.textContent ?? '')
      .join(' ');

    for (const texto of [
      'Razón social',
      'NIT',
      'Tipo de cuenta',
      'Número de cuenta',
      'Titular',
      'Correo',
      'Contraseña',
    ]) {
      expect(etiquetas).toContain(texto);
    }
  });

  it('avisa en el cliente si el dígito del NIT no corresponde (UX temprana)', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    llenar(html, { ...datosValidos, nit: '900650321-9' });
    fixture.detectChanges();

    expect(html.textContent).toContain('dígito de verificación');
  });

  it('con datos válidos, registra el comercio y muestra "en verificación"', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    llenar(html, datosValidos);
    fixture.detectChanges();
    enviar(html);

    const peticion = http.expectOne('/api/comercios');
    expect(peticion.request.body).toEqual({
      razonSocial: 'Café Central',
      nit: '900650321-2',
      cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001234567', titular: 'Café Central' },
      credenciales: { email: 'ana@cafe.co', contrasena: 'secreta-12345678' },
    });
    peticion.flush({
      id: 'com-1',
      razonSocial: 'Café Central',
      nit: '900650321-2',
      estadoVerificacion: 'PENDIENTE',
      registradoEn: '2026-07-15T10:00:00Z',
    });
    fixture.detectChanges();

    expect(html.textContent).toContain('Tu comercio está en verificación');
    expect(html.querySelector('a[href="/entrar"]')).not.toBeNull();
  });

  it('un 400 (NIT inválido para el backend) muestra el mensaje del servidor', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    llenar(html, datosValidos);
    fixture.detectChanges();
    enviar(html);

    http
      .expectOne('/api/comercios')
      .flush(
        { mensaje: 'El dígito de verificación del NIT 900650321 no corresponde (se esperaba 2)' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('no corresponde');
  });

  it('un 409 (NIT duplicado) muestra el mensaje del servidor sin perder los datos', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    llenar(html, datosValidos);
    fixture.detectChanges();
    enviar(html);

    http.expectOne('/api/comercios').flush(
      { mensaje: 'Ya existe un comercio registrado con ese NIT' },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Ya existe');
    expect(html.querySelector<HTMLInputElement>('[name="razonSocial"]')?.value).toBe(
      'Café Central',
    );
  });
});
