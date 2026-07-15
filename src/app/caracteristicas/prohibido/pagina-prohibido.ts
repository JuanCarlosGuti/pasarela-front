import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** 403 (HUF-002): sin detalles internos — solo qué pasó y a dónde ir. */
@Component({
  selector: 'app-pagina-prohibido',
  imports: [RouterLink],
  template: `
    <h1>No tienes permiso</h1>
    <p>Tu cuenta no puede ver esta pantalla.</p>
    <a routerLink="/entrar">Volver a entrar</a>
  `,
})
export class PaginaProhibido {}
