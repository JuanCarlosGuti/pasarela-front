import { Routes } from '@angular/router';

// El mapa del MVP (docs/01): cada característica carga perezosamente.
// Las pantallas reales reemplazan a los placeholders en su sprint.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'entrar' },
  {
    path: 'entrar',
    title: 'Entrar · Pasarela',
    loadComponent: () =>
      import('./caracteristicas/autenticacion/pagina-entrar').then((m) => m.PaginaEntrar),
  },
  {
    path: 'caja',
    title: 'Caja · Pasarela',
    loadComponent: () => import('./caracteristicas/caja/pagina-caja').then((m) => m.PaginaCaja),
  },
  {
    path: 'pagar/:referencia',
    title: 'Tu pago · Pasarela',
    loadComponent: () =>
      import('./caracteristicas/pagador/pagina-pagador').then((m) => m.PaginaPagador),
  },
  {
    path: 'registro',
    title: 'Registro · Pasarela',
    loadComponent: () =>
      import('./caracteristicas/registro/pagina-registro').then((m) => m.PaginaRegistro),
  },
  {
    path: 'tablero',
    title: 'Tu negocio · Pasarela',
    loadComponent: () =>
      import('./caracteristicas/tablero/pagina-tablero').then((m) => m.PaginaTablero),
  },
  {
    path: 'admin',
    title: 'Administración · Pasarela',
    loadComponent: () => import('./caracteristicas/admin/pagina-admin').then((m) => m.PaginaAdmin),
  },
];
