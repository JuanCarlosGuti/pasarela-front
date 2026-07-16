# 05 — Auditoría de accesibilidad y endurecimiento del cliente (TF-004)

> Ejecutada el 2026-07-16 sobre `develop`, con axe-core (WCAG 2.x A/AA)
> corriendo dentro de la suite Playwright contra el sistema real. La
> auditoría NO es un evento único: `e2e/accesibilidad.spec.ts` corre en cada
> push (job `e2e` del CI), así que una regresión AA rompe la build.

## Alcance

- **Flujos auditados con axe:** entrar (login), la caja (teclado de cobro y
  pantalla del QR/espera), registro del comercio, y el tablero con
  liquidaciones. Los cuatro pasan AA sin violaciones.
- **Teclado:** el login completo se ejecuta solo con Tab/Enter (probado en
  E2E, sin un solo clic).
- **Almacenamiento (ADR-F002, re-verificado):** tras iniciar sesión no hay
  JWT en `localStorage`, `sessionStorage`, cookies ni en la URL (probado en
  E2E buscando el prefijo `eyJ` de todo JWT).
- **Dependencias:** `npm audit --audit-level=high` en el CI. Al cierre de
  TF-004 quedan 3 vulnerabilidades **low** transitivas de `@angular/build`
  (tooling de desarrollo, sin fix aguas arriba); ninguna high/critical.

## Hallazgos y correcciones

| Hallazgo (axe)                                          | Dónde                                                                    | Corrección                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `aria-prohibited-attr`: `aria-label` en `<div>` sin rol | El QR de la caja                                                         | Se agregó `role="img"` al contenedor del SVG                              |
| `color-contrast` 3.2:1 (AA exige 4.5:1)                 | Cuenta regresiva y badges que usan `--color-alerta` (#e65100) con blanco | El token pasó a `#bf360c` (5.6:1) — un solo cambio corrige todos los usos |
| `color-contrast` 3.5:1                                  | Badges "Pendiente" con fondo `#888` y texto blanco (admin, historiales)  | Fondo a `#6e6e6e` (5.1:1) en los tres archivos                            |

## Deuda conocida (no bloquea AA)

- Las 3 vulnerabilidades low de `@angular/build` se van cuando Angular
  actualice esbuild; el gate del CI (`--audit-level=high`) las tolera a
  propósito para no bloquear cada push con ruido de tooling.
- axe solo ve lo que se renderiza: las pantallas se auditan con datos
  reales donde el E2E los crea (caja con QR, tablero), y vacías donde no
  (historiales). Si una pantalla gana estados nuevos, agregar el escenario
  al spec de accesibilidad.
