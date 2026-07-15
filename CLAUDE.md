# CLAUDE.md — Pasarela de Pagos Cripto · FRONTEND

> Este archivo lo lee Claude Code al inicio de cada sesión. Define contexto,
> reglas y convenciones del frontend. Mantenerlo **conciso**.

---

## 1. Qué es este proyecto

Frontend web de la pasarela que permite a comercios en Colombia **cobrar en
criptomonedas y recibir pesos (COP)**. Este repo es la cara visible de tres
usuarios:

- **El comercio (la caja):** digita un monto, muestra un QR, ve "PAGADO ✓".
  Vive en el celular del tendero — **mobile-first no negociable**.
- **El pagador:** página pública con el estado de su pago.
- **El admin:** verificación de comercios y límites.

El backend (repo hermano `c:\dev\proyectos\pagos`, GitHub `pasarela-Cripto`)
expone la API REST; su contrato vivo está en `http://localhost:8080/v3/api-docs`
(Swagger UI en `/swagger-ui.html`). **Este repo no contiene lógica de negocio:
el backend es la única fuente de verdad.**

---

## 2. REGLAS DE ORO del frontend (nunca violar)

1. **Cero lógica de dinero en el cliente.** El front NUNCA calcula comisiones,
   estados de orden ni validez de pagos: muestra lo que el backend responde.
   Un front que "deduce" estados miente en la caja.
2. **Cero secretos.** Ni API keys, ni secretos de proveedor, ni nada firmable
   vive en este repo o en el navegador. Solo el JWT de la sesión del usuario.
3. **Nada sensible en URLs, logs ni almacenamiento persistente.** El token va
   en memoria (ver ADR-F002); jamás datos personales en query params.
4. La REGLA DE ORO del negocio (la plataforma nunca custodia fondos) aplica
   también aquí: ninguna pantalla puede sugerir que "nosotros" recibimos o
   entregamos dinero — el proveedor liquida directo al comercio.

---

## 3. Stack técnico

- **Angular 22** · componentes standalone · **signals** · **zoneless** (sin zone.js)
- TypeScript estricto · SCSS
- **Pruebas:** Vitest (+ jsdom) para unitarias/componentes · Playwright para E2E (se agrega en F1)
- **Calidad:** ESLint (angular-eslint) + Prettier · GitHub Actions (CI en cada push)
- Sin librerías de estado ni de UI hasta que duelan (ADR-F002): signals + servicios + CSS propio

---

## 4. Arquitectura

Estructura por características (features), con núcleo compartido:

```
src/app/
├── nucleo/              # transversal: auth, interceptores, guardas, api, errores
│   ├── auth/            # sesión JWT, guardas por rol
│   └── api/             # clientes HTTP tipados por contexto del backend
├── compartido/          # componentes/pipes/utilidades reutilizables y tokens de diseño
└── caracteristicas/
    ├── autenticacion/   # login
    ├── caja/            # crear cobro → QR → PAGADO ✓ (el corazón)
    ├── pagador/         # página pública /pagar/:referencia
    ├── registro/        # onboarding del comercio
    ├── tablero/         # ventas, historial, CSV, comprobante
    └── admin/           # verificación y límites
```

Reglas:

- `caracteristicas/*` no se importan entre sí; comparten solo vía `nucleo/` y
  `compartido/` (misma filosofía de fronteras del backend).
- Rutas con lazy loading por característica.
- La actualización de "PAGADO ✓" es **polling corto (2-3 s)** contra
  `GET /api/ordenes/{id}` — decisión heredada del ADR-005 del backend
  (ver ADR-F003). Nada de WebSockets/SSE en el MVP.

Detalle completo en `docs/02-arquitectura.md`.

---

## 5. Convenciones (mismo espíritu del backend)

- **Todo en español**: componentes, servicios, variables, commits, docs
  (`PantallaDeCobro`, `SesionService`, `monto`).
- **TDD:** primero la prueba, luego el componente. Sin prueba no hay merge.
- Componentes cortos, una responsabilidad; lógica en servicios testeables.
- Estados de UI explícitos SIEMPRE: cargando / error / vacío / éxito.
- Accesibilidad desde el día uno: HTML semántico, foco visible, contraste AA.
- Commits: Conventional Commits en español. Ramas `feature/HUF-xxx-...` desde
  `develop`; nunca commitear directo a `main` ni `develop`.
- Guías completas: `docs/03-guia-estilo.md` y `docs/04-diseno-ui.md`.

---

## 6. Cómo trabajar conmigo (Juan Carlos)

- Explícame el **por qué** de las decisiones; soy arquitecto de software.
- Antes de cambios grandes, **muéstrame el plan**; diff antes de aplicar.
- Incrementos pequeños y verificables. Responde en español.
- Si algo roza las reglas de la sección 2, párate y avísame.

---

## 7. Documentación (fuente de verdad)

| Documento                                       | Ruta                                              |
| ----------------------------------------------- | ------------------------------------------------- |
| Visión y alcance del MVP front                  | `docs/01-vision-y-alcance-mvp.md`                 |
| Arquitectura                                    | `docs/02-arquitectura.md`                         |
| Guía de estilo / pruebas                        | `docs/03-guia-estilo.md`                          |
| Diseño UI (tokens, mobile-first, accesibilidad) | `docs/04-diseno-ui.md`                            |
| Decisiones de arquitectura                      | `docs/adr/`                                       |
| Flujo de trabajo Git                            | `docs/gestion/01-flujo-de-trabajo-git.md`         |
| **Backlog de historias (fuente de verdad)**     | `docs/gestion/02-backlog-historias-de-usuario.md` |
| Plan de sprints (por alcance)                   | `docs/gestion/03-plan-de-sprints.md`              |

Reglas derivadas: al iniciar una historia ⬜→🔵 y rama `feature/HUF-xxx`; al
mergearla con DoD cumplida 🔵→✅ (`docs(gestion): completar HUF-xxx`); cierre de
sprint = merge `develop`→`main` + tag `vF0.<sprint>.0` + retro de 3 líneas.

---

## 8. Entorno de desarrollo

- Backend local: `docker compose up -d` + `./mvnw spring-boot:run` (perfil
  local) en el repo hermano → API en `http://localhost:8080`.
- Front: `npm start` → `http://localhost:4200` (proxy a la API configurado en
  `proxy.conf.json` para evitar CORS en desarrollo).
- Pruebas: `npm test` (Vitest) · E2E: `npm run e2e` (Playwright, desde F1).

## 9. Estado actual

- [x] **Sprint F0:** fundaciones — esqueleto, docs, CI, tokens, rutas — `vF0.0.1`
- [x] **Sprint F1:** autenticación (login, sesión, guardas, expiración) — `vF0.1.0`
- [ ] **Sprint F2:** la caja de cobro (monto → QR → polling → PAGADO ✓)
- [ ] **Sprint F3:** página del pagador + registro de comercio
- [ ] **Sprint F4:** tablero (ventas día/mes, historial, CSV, comprobante)
- [ ] **Sprint F5:** admin + accesibilidad + endurecimiento

Backlog y sprints al detalle: `docs/gestion/02` y `docs/gestion/03`.
