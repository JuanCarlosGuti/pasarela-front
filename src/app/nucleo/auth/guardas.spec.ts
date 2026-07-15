import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { guardaDeRol } from './guardas';
import { SesionService } from './sesion.service';

function tokenConClaims(claims: Record<string, unknown>): string {
  const codificar = (parte: object) =>
    btoa(JSON.stringify(parte)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${codificar({ alg: 'HS256' })}.${codificar(claims)}.firma-falsa`;
}

describe('guardaDeRol (HUF-002)', () => {
  let sesion: SesionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    sesion = TestBed.inject(SesionService);
    router = TestBed.inject(Router);
  });

  function ejecutar(rolRequerido: 'COMERCIO' | 'ADMIN'): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      guardaDeRol(rolRequerido)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('sin sesión, redirige a /entrar', () => {
    const resultado = ejecutar('COMERCIO');
    expect(resultado).toBeInstanceOf(UrlTree);
    expect(resultado.toString()).toBe(router.parseUrl('/entrar').toString());
  });

  it('con el rol correcto, deja pasar', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO' }));
    expect(ejecutar('COMERCIO')).toBe(true);
  });

  it('con sesión pero rol equivocado, redirige a /prohibido', () => {
    sesion.iniciar(tokenConClaims({ rol: 'COMERCIO' }));
    const resultado = ejecutar('ADMIN');
    expect(resultado).toBeInstanceOf(UrlTree);
    expect(resultado.toString()).toBe(router.parseUrl('/prohibido').toString());
  });
});
