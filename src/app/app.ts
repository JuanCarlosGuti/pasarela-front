import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SesionService } from './nucleo/auth/sesion.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  protected salir(): void {
    this.sesion.cerrar();
    this.router.navigateByUrl('/entrar');
  }
}
