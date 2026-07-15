import { Component, inject } from '@angular/core';
import { CajaService } from './caja.service';

/**
 * La caja (HUF-003): una pantalla, una decisión (docs/04). El estado vive
 * en CajaService; este componente solo pinta la fase y captura toques.
 */
@Component({
  selector: 'app-pagina-caja',
  templateUrl: './pagina-caja.html',
  styleUrl: './pagina-caja.scss',
})
export class PaginaCaja {
  protected readonly caja = inject(CajaService);
  protected readonly digitos = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
}
