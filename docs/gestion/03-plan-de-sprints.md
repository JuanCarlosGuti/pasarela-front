# Gestión 03 — Plan de sprints (frontend)

> Sprints **por alcance, no por fechas**. Cerrar = merge `develop`→`main` por
> PR con CI verde + tag `vF0.<sprint>.0` con retro de 3 líneas. Mismas reglas
> del backend: un sprint a la vez; el alcance se recorta, la calidad no.

## Sprint F0 — Fundaciones 🧱

**Objetivo:** proyecto compilando con reglas escritas y CI vigilando.
**Historias:** TF-001, TF-002, TF-003 · **Tag:** `vF0.0.1`
**Criterio de cierre:** `npm run lint` + `npm test` + build en CI verde;
documentación completa; tokens y rutas lazy listas; captura móvil 360px.

## Sprint F1 — Autenticación 🔐

**Objetivo:** sesión JWT segura con roles, contra el backend real.
**Historias:** HUF-001, HUF-002 · **Tag:** `vF0.1.0`
**Criterio de cierre:** login feliz y triste E2E (Playwright) contra backend
local; 401/403/429 manejados; token solo en memoria (revisado).

## Sprint F2 — La caja 💛 (el corazón)

**Objetivo:** cobrar de verdad: monto → QR → PAGADO ✓ con el simulador.
**Historias:** HUF-003, HUF-004, HUF-005 · **Tag:** `vF0.2.0`
**Criterio de cierre:** demo en vivo completa (crear cobro → webhook simulado
→ PAGADO ✓ en pantalla); expiración y caídas de red manejadas; E2E rey verde.
**Al cerrar F2 existe la demo visual del producto.**

## Sprint F3 — Pagador y onboarding 🚪

**Objetivo:** el pagador ve su pago; un comercio nuevo entra solo.
**Historias:** HUF-006, HUF-007 · **Tag:** `vF0.3.0`
**Criterio de cierre:** flujo pagador E2E; registro → "en verificación" E2E.

## Sprint F4 — El tablero 📊

**Objetivo:** el dueño ve su negocio: hoy/mes, historial, CSV, comprobante.
**Historias:** HUF-008..HUF-011 · **Tag:** `vF0.4.0`
**Criterio de cierre:** paridad visual con lo que el backend ya expone
(Sprint 6 del backend); CSV descarga y abre en Excel; comprobante imprime.

## Sprint F5 — Admin y endurecimiento 🛡️

**Objetivo:** operación admin + MVP presentable y accesible.
**Historias:** HUF-012, HUF-013, TF-004 · **Tag:** **`vF1.0.0`** (MVP front)
**Criterio de cierre:** auditoría AA de los 3 flujos; npm audit limpio;
suite Playwright completa en CI.

---

## Estado actual

| Sprint                      | Estado       | Tag       |
| --------------------------- | ------------ | --------- |
| F0 — Fundaciones            | ✅ cerrado   | `vF0.0.1` |
| F1 — Autenticación          | ✅ cerrado   | `vF0.1.0` |
| F2 — La caja                | ✅ cerrado   | `vF0.2.0` |
| F3 — Pagador + onboarding   | ✅ cerrado   | `vF0.3.0` |
| F4 — Tablero                | 🔵 en curso  | —         |
| F5 — Admin + endurecimiento | ⬜ pendiente | —         |

> Actualizar esta tabla al abrir/cerrar cada sprint (commit `docs(gestion)`).

## Dependencias con el backend

| Necesidad del front                                    | Estado                                         |
| ------------------------------------------------------ | ---------------------------------------------- |
| API local (`localhost:8080`, perfil local + simulador) | ✅ existe (v0.6.0)                             |
| CORS si se sirve sin proxy en dev                      | ⬜ tarea backend si aplica (evitada con proxy) |
| Contrato OpenAPI vivo                                  | ✅ `/v3/api-docs`                              |
