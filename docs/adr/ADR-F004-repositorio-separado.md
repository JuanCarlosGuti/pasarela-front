# ADR-F004 — Repositorio separado del backend

**Estado:** Aceptado

## Contexto

El backend vive en `pasarela-Cripto` (monolito modular Java). Había dos
opciones para el front: carpeta dentro del mismo repo (monorepo) o repositorio
independiente.

## Decisión

**Repositorio independiente** (`pasarela-front`), carpeta local hermana
(`c:\dev\proyectos\pasarela-front`). Es lo que la arquitectura del backend
declaró desde el día uno ("Frontend: Angular — repositorio separado").

## Consecuencias

- **A favor:** ciclos de vida independientes (CI de Java no corre por un
  cambio de CSS y viceversa); tags y sprints propios (`vF0.x.0` vs `v0.x.0`);
  historia de git limpia por tecnología; cero riesgo de que un commit cruce
  fronteras.
- **En contra / mitigación:** el contrato puede desincronizarse → la fuente de
  verdad es el OpenAPI vivo del backend, y los E2E de Playwright corren contra
  el backend real con simulador: una ruptura de contrato se detecta en CI del
  front, no en producción.
- La coordinación entre repos se registra en los backlogs respectivos (p. ej.
  "habilitar CORS" es tarea del backend, referenciada desde HUF-001).
