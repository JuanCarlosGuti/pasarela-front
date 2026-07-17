import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../nucleo/api/auth-api';
import { SesionService } from '../../nucleo/auth/sesion.service';

/**
 * Login (HUF-001). El error del 401 es GENÉRICO a propósito: el backend
 * responde idéntico exista o no el correo, y esta pantalla no deshace ese
 * cuidado. El 429 respeta Retry-After con cuenta regresiva visible.
 */
@Component({
  selector: 'app-pagina-entrar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './pagina-entrar.html',
  styleUrl: './pagina-entrar.scss',
})
export class PaginaEntrar {
  private readonly authApi = inject(AuthApi);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly segundosDeEspera = signal(0);

  protected readonly formulario = new FormGroup({
    usuario: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contrasena: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    // HUF-002: si el interceptor cerró la sesión por un 401, se explica aquí
    if (this.sesion.consumirAvisoDeExpiracion()) {
      this.error.set('Tu sesión expiró. Vuelve a entrar');
    }
  }

  protected get botonBloqueado(): boolean {
    return this.cargando() || this.segundosDeEspera() > 0;
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.botonBloqueado) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const { usuario, contrasena } = this.formulario.getRawValue();
    this.authApi.iniciarSesion(usuario, contrasena).subscribe({
      next: ({ token }) => {
        this.sesion.iniciar(token);
        this.cargando.set(false);
        this.router.navigateByUrl(this.sesion.rol() === 'ADMIN' ? '/admin' : '/caja');
      },
      error: (fallo: HttpErrorResponse) => {
        this.cargando.set(false);
        if (fallo.status === 429) {
          this.iniciarEspera(fallo);
          return;
        }
        if (fallo.status === 401) {
          this.error.set('Correo o contraseña incorrectos');
          return;
        }
        this.error.set('No pudimos conectarnos. Revisa tu red e intenta de nuevo');
      },
    });
  }

  /** 429: cuenta regresiva con el Retry-After del backend (HU-022). */
  private iniciarEspera(fallo: HttpErrorResponse): void {
    const segundos = Number(fallo.headers.get('Retry-After')) || 60;
    this.error.set('Demasiados intentos. Espera un momento');
    this.segundosDeEspera.set(segundos);
    const temporizador = setInterval(() => {
      const restante = this.segundosDeEspera() - 1;
      this.segundosDeEspera.set(restante);
      if (restante <= 0) {
        clearInterval(temporizador);
        this.error.set(null);
      }
    }, 1000);
  }
}
