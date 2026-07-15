import { Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as QRCode from 'qrcode';
import { CajaService } from './caja.service';
import { HistorialJornada } from './historial-jornada';

/**
 * La caja (HUF-003/004/005): una pantalla, una decisión (docs/04). El
 * estado vive en CajaService; aquí solo se pinta la fase y se generan los
 * píxeles del QR. Salir de la pantalla suspende el sondeo; volver lo
 * reanuda.
 */
@Component({
  selector: 'app-pagina-caja',
  imports: [HistorialJornada],
  templateUrl: './pagina-caja.html',
  styleUrl: './pagina-caja.scss',
})
export class PaginaCaja implements OnInit, OnDestroy {
  protected readonly caja = inject(CajaService);
  private readonly sanitizador = inject(DomSanitizer);

  protected readonly digitos = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly qrSvg = signal<SafeHtml | null>(null);
  protected readonly mostrandoHistorial = signal(false);

  constructor() {
    effect(() => {
      const orden = this.caja.orden();
      if (orden === null) {
        this.qrSvg.set(null);
        return;
      }
      void QRCode.toString(orden.qr.contenido, { type: 'svg', margin: 1 }).then((svg) => {
        // seguro de confiar: el SVG lo generamos NOSOTROS a partir del
        // contenido del cobro — no es HTML que venga de la red
        this.qrSvg.set(this.sanitizador.bypassSecurityTrustHtml(svg));
      });
    });
  }

  ngOnInit(): void {
    this.caja.reanudar();
  }

  ngOnDestroy(): void {
    this.caja.suspender();
  }
}
