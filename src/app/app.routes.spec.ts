import { routes } from './app.routes';

// TF-003: el mapa de navegación del MVP existe desde el día uno, con carga
// perezosa por característica (docs/02). Las pantallas reales llegan en sus
// sprints; las rutas ya son contrato.
describe('rutas de la aplicación', () => {
  const rutasEsperadas = ['entrar', 'caja', 'pagar/:referencia', 'registro', 'tablero', 'admin'];

  it('define las seis características del MVP', () => {
    const paths = routes.map((ruta) => ruta.path);
    for (const esperada of rutasEsperadas) {
      expect(paths, `falta la ruta ${esperada}`).toContain(esperada);
    }
  });

  it('todas las características cargan perezosamente (loadComponent)', () => {
    const conCarga = routes.filter((ruta) => rutasEsperadas.includes(ruta.path ?? ''));
    for (const ruta of conCarga) {
      expect(ruta.loadComponent, `la ruta ${ruta.path} no es perezosa`).toBeTypeOf('function');
    }
  });

  it('la raíz redirige a entrar', () => {
    const raiz = routes.find((ruta) => ruta.path === '');
    expect(raiz?.redirectTo).toBe('entrar');
  });

  it('cada característica declara su título de pestaña', () => {
    const conCarga = routes.filter((ruta) => rutasEsperadas.includes(ruta.path ?? ''));
    for (const ruta of conCarga) {
      expect(ruta.title, `la ruta ${ruta.path} no tiene título`).toBeTruthy();
    }
  });
});
