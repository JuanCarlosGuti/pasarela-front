# Gestión 02 — Backlog de historias de usuario (frontend)

> **Fuente de verdad del backlog del front.** HUF-xxx = historia con valor
> visible; TF-xxx = tarea técnica. Estados: ⬜ pendiente · 🔵 en curso ·
> ✅ terminada. Cada historia cumple la Definition of Done de
> `docs/03-guia-estilo.md`.

**Roles:** `Cajero` (quien cobra) · `Dueño` (dueño del comercio) · `Pagador` ·
`Admin` · `Dev`.

---

## Épica EF0 — Fundaciones _(Sprint F0)_

### ✅ TF-001 — Esqueleto, repo y documentación

**Como** Dev **quiero** el proyecto Angular 22 con repo propio y documentación
completa **para** construir con las mismas reglas que el backend.

**Criterios de aceptación:**

- Esqueleto Angular 22 (standalone, signals, zoneless, Vitest) compilando.
- Repo `pasarela-front` en GitHub con ramas `main` y `develop`.
- Documentación completa: CLAUDE.md, docs/01-04, 4 ADRs, gestión 01-03.
- `npm test` y `npm run build` en verde.

### ✅ TF-002 — CI y calidad automática

**Como** Dev **quiero** lint + formato + pruebas en cada push **para** que
`develop` y `main` no se degraden.

**Criterios de aceptación:**

- ESLint (angular-eslint) + Prettier configurados; `npm run lint` limpio.
- GitHub Actions: lint + pruebas + build en push a `main`, `develop`,
  `feature/**`; badge en README.
- **Dado** un push con una prueba rota, **entonces** el CI falla.

### ✅ TF-003 — Tokens de diseño y esqueleto de navegación

**Como** Dev **quiero** los tokens de `docs/04` y el layout raíz mobile-first
**para** que ninguna pantalla invente estilos.

**Criterios de aceptación:**

- `_tokens.scss` con los valores de docs/04; estilos globales base.
- Layout raíz con rutas lazy por característica (placeholder por feature).
- `proxy.conf.json` hacia `http://localhost:8080` documentado en README.
- Verificado en viewport 360px (captura en el PR).

---

## Épica EF1 — Autenticación _(Sprint F1)_

### ✅ HUF-001 — Iniciar sesión

**Como** Dueño **quiero** entrar con mi correo y contraseña **para** operar
mi caja y mi tablero.

**Criterios de aceptación:**

- **Dado** credenciales válidas, **cuando** envío el formulario, **entonces**
  quedo autenticado y navego según mi rol (COMERCIO → caja, ADMIN → admin).
- **Dado** credenciales inválidas, **entonces** veo un error genérico (sin
  revelar si el correo existe — espejo del 401 idéntico del backend).
- **Dado** un 429 del backend, **entonces** veo "Demasiados intentos, espera
  un momento" respetando `Retry-After` (botón deshabilitado con cuenta).
- El token JWT vive SOLO en memoria (ADR-F002); nada en storage.
- Formulario accesible: labels reales, submit con Enter, foco al error.
- E2E Playwright: login feliz + credenciales malas contra backend local.
- _Coordinación backend:_ si se sirve desde otro origen en dev, tarea CORS
  (T-00x del backlog backend); con proxy no hace falta.

### ✅ HUF-002 — Sesión, guardas y expiración

**Como** Dueño **quiero** que la app maneje mi sesión con seguridad **para**
no quedar expuesto ni bloqueado sin explicación.

**Criterios de aceptación:**

- Rutas protegidas por guardas de rol; entrar sin sesión → login.
- **Dado** un 401 en cualquier llamada (token vencido), **entonces** vuelvo a
  login con "Tu sesión expiró" y sin restos de estado en memoria.
- 403 → pantalla "No tienes permiso" (sin filtrar detalles).
- Cerrar sesión limpia todo y vuelve a login.
- El interceptor agrega `Authorization` SOLO en llamadas a `/api/*`.

---

## Épica EF2 — La caja _(Sprint F2 — el corazón)_

### ✅ HUF-003 — Crear un cobro

**Como** Cajero **quiero** digitar un monto y tocar COBRAR **para** generar el
QR en segundos.

**Criterios de aceptación:**

- Teclado numérico propio, grande; monto formateado en COP (`$ 25.000`,
  sin decimales); no permite 0 ni vacío.
- **Dado** un monto válido, **cuando** toco COBRAR, **entonces** veo "Creando
  cobro…" y llego a la pantalla del QR.
- **Dado** un 422 por límites (tope por transacción/mes del backend),
  **entonces** veo el mensaje del backend en lenguaje claro y puedo corregir.
- **Dado** proveedor caído (502), **entonces** veo "No pudimos crear el cobro.
  Reintenta" con botón de reintento (sin orden fantasma — el backend garantiza).
- Pruebas: componente (formato/validación) + servicio (estados) + E2E feliz.

### ✅ HUF-004 — Esperar el pago y ver PAGADO ✓

**Como** Cajero **quiero** ver el QR y enterarme al instante del pago
**para** entregar el producto sin dudar.

**Criterios de aceptación:**

- QR grande (desde `contenidoQr`) + monto + cuenta regresiva de expiración;
  botón deeplink "Pagar desde la app" visible en móvil.
- Polling 2.5 s (ADR-F003) con temporizadores testeados en falso.
- **Dado** que el backend reporta `PAGO_DETECTADO` (o posterior), **entonces**
  pantalla completa verde "PAGADO ✓" + monto + hora, anunciada con `aria-live`.
- **Dado** que expira, **entonces** estado EXPIRADA con "Volver a cobrar" a un
  toque (precarga el mismo monto).
- **Dado** pérdida de red durante la espera, **entonces** indicador "sin
  conexión, reintentando…" y el polling se recupera solo (backoff suave).
- Salir de la pantalla detiene el polling (verificado en prueba).
- E2E rey: cobrar → webhook del simulador → PAGADO ✓ en pantalla.

### ✅ HUF-005 — Historia de la sesión de caja

**Como** Cajero **quiero** ver los últimos cobros de mi jornada **para**
responder "¿sí te llegó?" sin salir de la caja.

**Criterios de aceptación:**

- Lista de los cobros de la sesión (hora, monto, estado) alimentada por la
  API de ventas; toque → detalle con transiciones.
- Estados visuales inconfundibles (pagado/pendiente/expirado).
- Vacío amable ("Aún no has cobrado hoy").

---

## Épica EF3 — Pagador y onboarding _(Sprint F3)_

### ✅ HUF-006 — Página pública del pagador

**Como** Pagador **quiero** ver el estado de mi pago en vivo **para** saber
que quedó confirmado.

**Criterios de aceptación:**

- Ruta pública `/pagar/:referencia` contra `GET /api/pagos/{referencia}`
  (solo estado y monto — el contrato estricto del backend).
- Polling con los mismos estados de la caja; PAGADO/EXPIRADO inconfundibles.
- Referencia inexistente → "Este pago no existe" (404 amable).
- Sin datos del comercio ni internos; sin sesión.

### ✅ HUF-007 — Registro del comercio

**Como** Dueño **quiero** registrarme en minutos **para** empezar la
verificación.

**Criterios de aceptación:**

- Formulario: razón social, NIT (con ayuda de dígito de verificación en
  cliente como UX temprana — la validación REAL es la del backend), cuenta de
  liquidación (tipo + número + titular), correo y contraseña.
- 400 (NIT inválido) y 409 (NIT duplicado) → mensajes del backend, claros.
- Éxito → pantalla "Tu comercio está en verificación" con qué sigue.
- E2E: registro → login → estado pendiente visible.

---

## Épica EF4 — El tablero _(Sprint F4)_

### ✅ HUF-008 — Ventas de hoy y del mes

**Como** Dueño **quiero** ver cuánto he vendido hoy y en el mes **para**
tener el pulso del negocio.

**Criterios:** tarjetas grandes (total y cantidad, día/mes) desde
`/api/ventas/resumen`; actualiza al volver a la pestaña; estados de carga/error.

### ⬜ HUF-009 — Historial de movimientos

**Como** Dueño **quiero** revisar mis órdenes con filtros de fecha **para**
verificar cualquier venta.

**Criterios:** lista paginada (`/api/ventas`), filtros desde/hasta con rangos
inválidos → mensaje del backend; móvil = tarjetas, escritorio = tabla.

### ⬜ HUF-010 — Exportar CSV

**Como** Dueño **quiero** descargar el CSV **para** entregárselo al contador.

**Criterios:** botón con rango de fechas → descarga `/api/ventas/exportar`
(el backend ya emite BOM+`;`); nombre `movimientos.csv`; error claro si falla.

### ⬜ HUF-011 — Comprobante de venta

**Como** Dueño **quiero** el comprobante de una venta **para** soportarla
ante el cliente y el contador.

**Criterios:** desde el detalle de una orden pagada → vista de comprobante
(`/api/ordenes/{id}/comprobante`) imprimible (print CSS) y compartible;
orden no pagada → el 422 del backend explicado ("solo ventas pagadas").

---

## Épica EF5 — Admin y endurecimiento _(Sprint F5)_

### ⬜ HUF-012 — Verificación de comercios (admin)

**Como** Admin **quiero** aprobar o rechazar comercios **para** controlar
quién cobra.

**Criterios:** lista de comercios con estado; detalle → APROBAR/RECHAZAR
(confirmación previa); errores 409 de transición inválida mostrados.

### ⬜ HUF-013 — Límites por comercio (admin)

**Como** Admin **quiero** ajustar topes por transacción y por mes **para**
gestionar riesgo.

**Criterios:** formulario de límites (PUT `/api/comercios/{id}/limites`),
validaciones y confirmación del cambio.

### ⬜ TF-004 — Accesibilidad y endurecimiento del cliente

**Como** Dev **quiero** cerrar el MVP con auditoría de accesibilidad y
seguridad de cliente **para** salir al piloto sin vergüenzas.

**Criterios:** auditoría AA de los 3 flujos clave (teclado, lector, contraste);
sin token en storage/URLs (re-verificado); dependencias npm sin críticas;
`npm audit` y Playwright completos en CI.

---

## Mapa historia → sprint

| Sprint | Historias                          |
| ------ | ---------------------------------- |
| F0     | TF-001, TF-002, TF-003             |
| F1     | HUF-001, HUF-002                   |
| F2     | HUF-003, HUF-004, HUF-005          |
| F3     | HUF-006, HUF-007                   |
| F4     | HUF-008, HUF-009, HUF-010, HUF-011 |
| F5     | HUF-012, HUF-013, TF-004           |

> **Cómo usar este backlog:** igual que el del backend — al iniciar ⬜→🔵 y
> rama `feature/HUF-xxx`; al mergear con DoD cumplida 🔵→✅ con commit
> `docs(gestion): completar HUF-xxx`.
