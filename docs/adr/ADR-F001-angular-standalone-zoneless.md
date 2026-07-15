# ADR-F001 — Angular 22 standalone + signals + zoneless

**Estado:** Aceptado

## Contexto

La arquitectura del proyecto (docs/02 del backend) fijó Angular para el
frontend. Al generar el esqueleto (jul-2026), Angular 22 trae por defecto
componentes standalone, signals maduros y modo **zoneless** (sin zone.js),
con Vitest como runner de pruebas.

## Decisión

Adoptar los defaults modernos completos: **standalone + signals + zoneless +
Vitest**. Sin NgModules, sin zone.js, sin Karma.

## Consecuencias

- **A favor:** menos magia (la reactividad es explícita vía signals — afín a
  nuestro estilo de "estado solo cambia por métodos"); mejor rendimiento en
  gama baja (sin parcheo global de zone.js); pruebas más rápidas (Vitest).
- **En contra / riesgos:** librerías viejas que dependan de zone.js no
  funcionarán — mitigado porque el MVP casi no usa librerías externas
  (ADR-F002). Los ejemplos antiguos de internet (NgModules) no aplican: la
  referencia es la documentación oficial actual.
