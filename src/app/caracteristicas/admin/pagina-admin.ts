import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ComercioRegistrado, ComerciosApi } from '../../nucleo/api/comercios-api';

interface EstadoVisual {
  etiqueta: string;
  clase: string;
}

const ESTADOS: Record<string, EstadoVisual> = {
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'pendiente' },
  VERIFICADO: { etiqueta: 'Verificado', clase: 'verificado' },
  RECHAZADO: { etiqueta: 'Rechazado', clase: 'rechazado' },
  SUSPENDIDO: { etiqueta: 'Suspendido', clase: 'suspendido' },
};

interface Confirmacion {
  comercio: ComercioRegistrado;
  decision: 'APROBAR' | 'RECHAZAR';
}

/**
 * Cola de verificación del admin (HUF-012): lista de comercios con filtro
 * por estado; aprobar/rechazar SIEMPRE con confirmación previa (decisiones
 * irreversibles a un toque, no). El motivo del rechazo lo exige el backend;
 * aquí solo se bloquea el botón hasta que exista. Los 409 de transición
 * inválida (p. ej. otro admin decidió primero) se muestran tal cual.
 */
@Component({
  selector: 'app-pagina-admin',
  imports: [FormsModule],
  templateUrl: './pagina-admin.html',
  styleUrl: './pagina-admin.scss',
})
export class PaginaAdmin implements OnInit {
  private readonly api = inject(ComerciosApi);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly comercios = signal<ComercioRegistrado[]>([]);
  protected readonly confirmando = signal<Confirmacion | null>(null);
  protected readonly errorDecision = signal<string | null>(null);
  protected readonly decidiendo = signal(false);

  protected filtro = '';
  protected motivo = '';

  ngOnInit(): void {
    this.cargar();
  }

  protected filtrar(): void {
    this.cargar();
  }

  protected pedirConfirmacion(
    comercio: ComercioRegistrado,
    decision: Confirmacion['decision'],
  ): void {
    this.confirmando.set({ comercio, decision });
    this.motivo = '';
    this.errorDecision.set(null);
  }

  protected cancelar(): void {
    this.confirmando.set(null);
    this.errorDecision.set(null);
  }

  protected get puedeConfirmar(): boolean {
    const confirmacion = this.confirmando();
    if (confirmacion === null || this.decidiendo()) {
      return false;
    }
    return confirmacion.decision === 'APROBAR' || this.motivo.trim().length > 0;
  }

  protected confirmar(): void {
    const confirmacion = this.confirmando();
    if (confirmacion === null || !this.puedeConfirmar) {
      return;
    }
    this.decidiendo.set(true);
    this.errorDecision.set(null);
    const motivo = confirmacion.decision === 'RECHAZAR' ? this.motivo.trim() : undefined;
    this.api
      .decidirVerificacion(confirmacion.comercio.id, confirmacion.decision, motivo)
      .subscribe({
        next: (actualizado) => {
          this.comercios.update((lista) =>
            lista.map((comercio) => (comercio.id === actualizado.id ? actualizado : comercio)),
          );
          this.decidiendo.set(false);
          this.confirmando.set(null);
        },
        error: (fallo: HttpErrorResponse) => {
          const mensajeDelBackend = (fallo.error as { mensaje?: string } | null)?.mensaje;
          this.errorDecision.set(
            mensajeDelBackend ?? 'No pudimos aplicar la decisión. Intenta de nuevo',
          );
          this.decidiendo.set(false);
        },
      });
  }

  protected estadoVisual(estado: string): EstadoVisual {
    return ESTADOS[estado] ?? { etiqueta: estado, clase: 'desconocido' };
  }

  protected formatearFecha(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  }

  protected trackPorId(_indice: number, comercio: ComercioRegistrado): string {
    return comercio.id;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar(this.filtro || undefined).subscribe({
      next: (comercios) => {
        this.comercios.set(comercios);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar los comercios. Intenta de nuevo');
        this.cargando.set(false);
      },
    });
  }
}
