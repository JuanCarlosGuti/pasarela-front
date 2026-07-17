import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComercioRegistrado, ComerciosApi } from '../../nucleo/api/comercios-api';
import { nitEsValido } from '../../compartido/validacion-nit';

/**
 * Registro del comercio (HUF-007): público, sin sesión. El NIT se
 * pre-valida en el cliente (UX temprana) pero el backend decide de verdad
 * (400/409 se muestran tal cual — REGLA DE ORO 1).
 *
 * <p>HUF-015: confirmación de contraseña (solo existe en el cliente — el
 * backend nunca la ve) y el requisito mínimo VISIBLE. El mínimo de 8
 * caracteres espeja la regla real de CrearCuentaComercioService; si el
 * backend la endurece, el 400 llegará con su mensaje igual.</p>
 *
 * <p>HUF-016: el banco/billetera viaja aparte del tipo (HU-027 del
 * backend). Las billeteras (Nequi, Daviplata...) se registran como AHORROS
 * por convención: al elegirlas, el tipo se fija solo y se bloquea.</p>
 */
/** Billeteras que se manejan como AHORROS por convención (HUF-016). */
const BILLETERAS = ['Nequi', 'Daviplata', 'Movii'];

@Component({
  selector: 'app-pagina-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './pagina-registro.html',
  styleUrl: './pagina-registro.scss',
})
export class PaginaRegistro {
  private readonly api = inject(ComerciosApi);

  protected readonly bancos = [
    'Nequi',
    'Daviplata',
    'Movii',
    'Bancolombia',
    'Davivienda',
    'Banco de Bogotá',
    'BBVA',
    'Banco de Occidente',
    'Banco Popular',
    'Banco Agrario',
    'Lulo Bank',
  ];

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly registrado = signal<ComercioRegistrado | null>(null);

  protected readonly formulario = new FormGroup({
    razonSocial: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nit: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    banco: new FormControl('Nequi', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl('AHORROS', { nonNullable: true, validators: [Validators.required] }),
    numero: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    titular: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    contrasena: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    // billetera elegida → tipo AHORROS fijo (bloqueado); banco → se libera
    this.aplicarReglaDeBilletera(this.formulario.controls.banco.value);
    this.formulario.controls.banco.valueChanges.subscribe((banco) =>
      this.aplicarReglaDeBilletera(banco),
    );
  }

  protected get esBilletera(): boolean {
    return BILLETERAS.includes(this.formulario.controls.banco.value);
  }

  private aplicarReglaDeBilletera(banco: string): void {
    const tipo = this.formulario.controls.tipo;
    if (BILLETERAS.includes(banco)) {
      tipo.setValue('AHORROS');
      tipo.disable();
    } else {
      tipo.enable();
    }
  }

  protected get nitConDigitoInvalido(): boolean {
    const nit = this.formulario.controls.nit.value.trim();
    return nit.includes('-') && !nitEsValido(nit);
  }

  protected get contrasenasNoCoinciden(): boolean {
    const { contrasena, confirmacion } = this.formulario.getRawValue();
    return confirmacion.length > 0 && contrasena !== confirmacion;
  }

  protected enviar(): void {
    if (
      this.formulario.invalid ||
      this.nitConDigitoInvalido ||
      this.contrasenasNoCoinciden ||
      this.enviando()
    ) {
      return;
    }
    const valores = this.formulario.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    this.api
      .registrar({
        razonSocial: valores.razonSocial,
        nit: valores.nit,
        cuentaLiquidacion: {
          banco: valores.banco,
          tipo: valores.tipo,
          numero: valores.numero,
          titular: valores.titular,
        },
        credenciales: { email: valores.email, contrasena: valores.contrasena },
      })
      .subscribe({
        next: (comercio) => {
          this.enviando.set(false);
          this.registrado.set(comercio);
        },
        error: (fallo: HttpErrorResponse) => {
          this.enviando.set(false);
          const mensajeDelBackend = (fallo.error as { mensaje?: string } | null)?.mensaje;
          this.error.set(mensajeDelBackend ?? 'No pudimos registrar tu comercio. Intenta de nuevo');
        },
      });
  }
}
