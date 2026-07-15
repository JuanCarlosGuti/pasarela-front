import { TestBed } from '@angular/core/testing';
import { SesionService } from './sesion.service';

// Fabrica un JWT de utilería (header.payload.firma) — la firma no se valida
// en el cliente: el backend es la única verdad (REGLA DE ORO 1 del front).
function tokenConClaims(claims: Record<string, unknown>): string {
  const codificar = (parte: object) =>
    btoa(JSON.stringify(parte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${codificar({ alg: 'HS256' })}.${codificar(claims)}.firma-falsa`;
}

describe('SesionService (ADR-F002: token solo en memoria)', () => {
  let sesion: SesionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sesion = TestBed.inject(SesionService);
  });

  it('sin iniciar, no hay sesión ni rol', () => {
    expect(sesion.estaAutenticada()).toBe(false);
    expect(sesion.token()).toBeNull();
    expect(sesion.rol()).toBeNull();
  });

  it('al iniciar, expone token, rol y comercio desde los claims', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO', comercioId: 'c-123', sub: 'ana@tienda.co' }));

    expect(sesion.estaAutenticada()).toBe(true);
    expect(sesion.rol()).toBe('COMERCIO');
    expect(sesion.comercioId()).toBe('c-123');
  });

  it('cerrar la sesión limpia TODO el estado en memoria', () => {
    sesion.iniciar(tokenConClaims({ rol: 'ADMIN' }));
    sesion.cerrar();

    expect(sesion.estaAutenticada()).toBe(false);
    expect(sesion.token()).toBeNull();
    expect(sesion.rol()).toBeNull();
  });

  it('un token ilegible deja la sesión sin iniciar en vez de reventar', () => {
    sesion.iniciar('esto-no-es-un-jwt');

    expect(sesion.estaAutenticada()).toBe(false);
    expect(sesion.rol()).toBeNull();
  });

  it('jamás toca localStorage ni sessionStorage (ADR-F002)', () => {
    const guardadoLocal = vi.spyOn(Storage.prototype, 'setItem');
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO' }));

    expect(guardadoLocal).not.toHaveBeenCalled();
  });
});
