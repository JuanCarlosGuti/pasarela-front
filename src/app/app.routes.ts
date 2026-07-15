import { Routes } from '@angular/router';
import { guardaDeRol } from './nucleo/auth/guardas';

// El mapa del MVP (docs/01): cada característica carga perezosamente y las
// privadas declaran su guarda de rol (HUF-002). La autorización real vive
// en el backend; la guarda solo evita pantallas que van a fallar.
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
    canActivate: [guardaDeRol('COMERCIO')],
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
    canActivate: [guardaDeRol('COMERCIO')],
    loadComponent: () =>
      import('./caracteristicas/tablero/pagina-tablero').then((m) => m.PaginaTablero),
  },
  {
    path: 'comprobante/:id',
    title: 'Comprobante · Pasarela',
    canActivate: [guardaDeRol('COMERCIO')],
    loadComponent: () =>
      import('./caracteristicas/comprobante/pagina-comprobante').then((m) => m.PaginaComprobante),
  },
  {
    path: 'admin',
    title: 'Administración · Pasarela',
    canActivate: [guardaDeRol('ADMIN')],
    loadComponent: () => import('./caracteristicas/admin/pagina-admin').then((m) => m.PaginaAdmin),
  },
  {
    path: 'prohibido',
    title: 'Sin permiso · Pasarela',
    loadComponent: () =>
      import('./caracteristicas/prohibido/pagina-prohibido').then((m) => m.PaginaProhibido),
  },
];
