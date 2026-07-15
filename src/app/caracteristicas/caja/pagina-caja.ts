import { Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as QRCode from 'qrcode';
import { CajaService } from './caja.service';
import { HistorialJornada } from './historial-jornada';
import { ComerciosApi } from '../../nucleo/api/comercios-api';
import { SesionService } from '../../nucleo/auth/sesion.service';

/**
 * La caja (HUF-003/004/005/007): una pantalla, una decisión (docs/04). El
 * estado del cobro vive en CajaService; aquí también se verifica que el
 * comercio ya esté aprobado (HUF-007) — un 403 críptico al tocar COBRAR es
 * peor experiencia que avisar antes. Salir de la pantalla suspende el
 * sondeo; volver lo reanuda.
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
  private readonly comerciosApi = inject(ComerciosApi);
  private readonly sesion = inject(SesionService);

  protected readonly digitos = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly qrSvg = signal<SafeHtml | null>(null);
  protected readonly mostrandoHistorial = signal(false);
  protected readonly verificandoComercio = signal(true);
  protected readonly comercioPendiente = signal(false);

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
    const comercioId = this.sesion.comercioId();
    if (comercioId === null) {
      this.verificandoComercio.set(false);
      return;
    }
    this.comerciosApi.consultar(comercioId).subscribe({
      next: (comercio) => {
        this.comercioPendiente.set(comercio.estadoVerificacion !== 'VERIFICADO');
        this.verificandoComercio.set(false);
      },
      error: () => {
        // fail-open: un error de red al consultar el estado no debe
        // impedir cobrar — el backend sigue siendo quien decide de verdad
        this.verificandoComercio.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.caja.suspender();
  }
}
