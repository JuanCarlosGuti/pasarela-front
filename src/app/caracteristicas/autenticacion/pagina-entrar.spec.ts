import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PaginaEntrar } from './pagina-entrar';
import { SesionService } from '../../nucleo/auth/sesion.service';

function tokenConClaims(claims: Record<string, unknown>): string {
  const codificar = (parte: object) =>
    btoa(JSON.stringify(parte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${codificar({ alg: 'HS256' })}.${codificar(claims)}.firma-falsa`;
}

describe('PaginaEntrar (HUF-001)', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginaEntrar],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  function crear() {
    const fixture = TestBed.createComponent(PaginaEntrar);
    fixture.detectChanges();
    return fixture;
  }

  function escribirCredenciales(html: HTMLElement, usuario: string, contrasena: string) {
    const campoUsuario = html.querySelector<HTMLInputElement>('input[name="usuario"]')!;
    const campoContrasena = html.querySelector<HTMLInputElement>('input[name="contrasena"]')!;
    campoUsuario.value = usuario;
    campoUsuario.dispatchEvent(new Event('input'));
    campoContrasena.value = contrasena;
    campoContrasena.dispatchEvent(new Event('input'));
  }

  function enviar(html: HTMLElement) {
    html.querySelector('form')!.dispatchEvent(new Event('submit'));
  }

  it('el formulario es accesible: labels reales para usuario y contraseña', () => {
    const html = crear().nativeElement as HTMLElement;
    const etiquetas = Array.from(html.querySelectorAll('label')).map((l) => l.textContent ?? '');

    expect(etiquetas.join(' ')).toContain('Correo');
    expect(etiquetas.join(' ')).toContain('Contraseña');
  });

  it('con credenciales válidas de COMERCIO, inicia sesión y navega a la caja', async () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    escribirCredenciales(html, 'ana@tienda.co', 'secreta-123');
    fixture.detectChanges();
    enviar(html);

    http.expectOne('/api/auth/login').flush({ token: tokenConClaims({ rol: 'COMERCIO' }) });
    await fixture.whenStable();

    expect(TestBed.inject(SesionService).estaAutenticada()).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/caja');
  });

  it('un ADMIN navega a la administración', async () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    escribirCredenciales(html, 'admin@pasarela.co', 'secreta-123');
    fixture.detectChanges();
    enviar(html);

    http.expectOne('/api/auth/login').flush({ token: tokenConClaims({ rol: 'ADMIN' }) });
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin');
  });

  it('con credenciales inválidas muestra un error GENÉRICO (sin revelar si el correo existe)', async () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    escribirCredenciales(html, 'nadie@x.co', 'clave-mala');
    fixture.detectChanges();
    enviar(html);

    http
      .expectOne('/api/auth/login')
      .flush({ mensaje: 'no importa' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();

    const error = html.querySelector('[role="alert"]');
    expect(error?.textContent).toContain('Correo o contraseña incorrectos');
    expect(error?.textContent).not.toContain('no existe');
    expect(TestBed.inject(SesionService).estaAutenticada()).toBe(false);
  });

  it('ante un 429 respeta Retry-After: botón deshabilitado con cuenta regresiva', () => {
    // solo se falsifica el intervalo de la cuenta regresiva: el resto del
    // mundo (microtareas, render) sigue real para no colgar el TestBed
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const fixture = crear();
      const html = fixture.nativeElement as HTMLElement;
      escribirCredenciales(html, 'ana@tienda.co', 'secreta-123');
      fixture.detectChanges();
      enviar(html);

      http.expectOne('/api/auth/login').flush(
        { mensaje: 'Demasiadas solicitudes' },
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'Retry-After': '3' },
        },
      );
      fixture.detectChanges();

      const boton = html.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(boton.disabled).toBe(true);
      expect(html.querySelector('[role="alert"]')?.textContent).toContain('Demasiados intentos');
      expect(html.textContent).toContain('3');

      // pasada la espera, el botón se habilita solo
      vi.advanceTimersByTime(3100);
      fixture.detectChanges();
      expect(boton.disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('mientras espera respuesta muestra estado de carga y bloquea reenvíos', () => {
    const fixture = crear();
    const html = fixture.nativeElement as HTMLElement;
    escribirCredenciales(html, 'ana@tienda.co', 'secreta-123');
    fixture.detectChanges();
    enviar(html);
    fixture.detectChanges();

    expect(html.textContent).toContain('Entrando');
    expect(html.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);

    http.expectOne('/api/auth/login').flush({ token: tokenConClaims({ rol: 'COMERCIO' }) });
  });
});
