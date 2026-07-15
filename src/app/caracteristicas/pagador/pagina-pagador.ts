import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { SondeoDePago } from './sondeo-de-pago';

/**
 * Página pública del pagador (HUF-006): sin sesión, solo estado y monto
 * (contrato estricto del backend). Se suscribe a los cambios de :referencia
 * por si el router reutiliza la instancia entre navegaciones.
 */
@Component({
  selector: 'app-pagina-pagador',
  templateUrl: './pagina-pagador.html',
  styleUrl: './pagina-pagador.scss',
})
export class PaginaPagador implements OnInit, OnDestroy {
  protected readonly sondeo = inject(SondeoDePago);
  private readonly ruta = inject(ActivatedRoute);
  private suscripcion: Subscription | null = null;

  ngOnInit(): void {
    this.suscripcion = this.ruta.paramMap.subscribe((parametros) => {
      const referencia = parametros.get('referencia');
      if (referencia) {
        this.sondeo.iniciar(referencia);
      }
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.sondeo.detener();
  }

  protected formatearMonto(monto: number | null): string {
    return monto === null ? '' : '$ ' + new Intl.NumberFormat('es-CO').format(monto);
  }
}
