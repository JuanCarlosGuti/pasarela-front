import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { SesionService } from './nucleo/auth/sesion.service';

describe('App (layout raíz)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('se crea', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la marca y los puntos de referencia accesibles (header y main)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.querySelector('header')?.textContent).toContain('Pasarela');
    expect(html.querySelector('main')).not.toBeNull();
    expect(html.querySelector('router-outlet')).not.toBeNull();
  });

  it('con sesión activa muestra Salir; al tocarlo cierra y vuelve a /entrar (HUF-002)', async () => {
    const sesion = TestBed.inject(SesionService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const codificar = (parte: object) =>
      btoa(JSON.stringify(parte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    sesion.iniciar(`${codificar({ alg: 'HS256' })}.${codificar({ rol: 'COMERCIO' })}.f`);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    const boton = html.querySelector<HTMLButtonElement>('button.salir');
    expect(boton?.textContent).toContain('Salir');

    boton!.click();

    expect(sesion.estaAutenticada()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/entrar');
  });

  it('sin sesión, el botón Salir no existe', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('button.salir')).toBeNull();
  });

  it('con sesión activa hay navegación a Caja y Tu negocio (HUF-008: sin ella no hay forma de llegar sin recargar)', async () => {
    const sesion = TestBed.inject(SesionService);
    const codificar = (parte: object) =>
      btoa(JSON.stringify(parte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    sesion.iniciar(`${codificar({ alg: 'HS256' })}.${codificar({ rol: 'COMERCIO' })}.f`);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    const enlaces = Array.from(html.querySelectorAll('nav a')).map((a) => a.textContent?.trim());

    expect(enlaces).toContain('Caja');
    expect(enlaces).toContain('Tu negocio');
  });

  it('sin sesión, la cabecera ofrece Entrar y Registro (HUF-015)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const enlaces = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav a'),
    ).map((a) => a.textContent?.trim());

    expect(enlaces).toContain('Entrar');
    expect(enlaces).toContain('Registro');
  });

  it('el botón de tema alterna la clase tema-oscuro y persiste la preferencia (HUF-018)', async () => {
    localStorage.removeItem('tema');
    document.documentElement.classList.remove('tema-oscuro');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button.tema',
    )!;
    const empezoOscuro = document.documentElement.classList.contains('tema-oscuro');

    boton.click();
    await fixture.whenStable();

    expect(document.documentElement.classList.contains('tema-oscuro')).toBe(!empezoOscuro);
    expect(localStorage.getItem('tema')).toBe(empezoOscuro ? 'claro' : 'oscuro');

    // limpieza: el documento es compartido entre pruebas
    document.documentElement.classList.remove('tema-oscuro');
    localStorage.removeItem('tema');
  });
});
