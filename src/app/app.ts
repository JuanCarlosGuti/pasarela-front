import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SesionService } from './nucleo/auth/sesion.service';

const CLAVE_TEMA = 'tema';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  /**
   * Tono oscuro (HUF-018). La preferencia SÍ va a localStorage: un tema no
   * es dato sensible (la regla 3 protege datos, no gustos visuales). Sin
   * preferencia guardada, manda el sistema operativo (prefers-color-scheme).
   */
  protected readonly temaOscuro = signal(this.preferenciaInicial());

  constructor() {
    effect(() => {
      const oscuro = this.temaOscuro();
      document.documentElement.classList.toggle('tema-oscuro', oscuro);
      localStorage.setItem(CLAVE_TEMA, oscuro ? 'oscuro' : 'claro');
    });
  }

  protected alternarTema(): void {
    this.temaOscuro.update((oscuro) => !oscuro);
  }

  protected salir(): void {
    this.sesion.cerrar();
    this.router.navigateByUrl('/entrar');
  }

  private preferenciaInicial(): boolean {
    const guardada = localStorage.getItem(CLAVE_TEMA);
    if (guardada === 'oscuro' || guardada === 'claro') {
      return guardada === 'oscuro';
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
