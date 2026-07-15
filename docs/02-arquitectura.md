# 02 — Arquitectura del frontend

> Principio rector: **el backend es la única fuente de verdad**. Este cliente
> presenta estados, jamás los deduce. Las fronteras internas imitan la
> disciplina hexagonal del backend a escala de UI.

## Organización por características

```
src/app/
├── nucleo/                      # transversal, sin UI de negocio
│   ├── auth/                    # SesionService (JWT en memoria), guardas por rol,
│   │                            #   interceptor Authorization, manejo 401/403/429
│   └── api/                     # clientes HTTP tipados: OrdenesApi, VentasApi,
│                                #   ComerciosApi, AuthApi (espejo de contextos del backend)
├── compartido/                  # BotonPrimario, CampoMonto, EstadoVacio, tokens SCSS...
└── caracteristicas/             # una carpeta = una feature con lazy loading
    ├── autenticacion/
    ├── caja/
    ├── pagador/
    ├── registro/
    ├── tablero/
    └── admin/
```

**Reglas de dependencia** (se revisan en PR; si duelen, se automatizan con
eslint-plugin-boundaries):
- `caracteristicas/*` NUNCA se importan entre sí.
- `nucleo/` y `compartido/` no importan de `caracteristicas/`.
- Los clientes de `nucleo/api` son el ÚNICO lugar con URLs del backend.

## Comunicación con el backend

- Contrato: OpenAPI vivo del backend (`/v3/api-docs`). Los tipos TS se escriben
  a mano por ahora (pocos endpoints); si crecen, se evalúa generación.
- Desarrollo: `proxy.conf.json` enruta `/api/*` → `http://localhost:8080`
  (sin CORS en dev). En despliegue, mismo origen o CORS explícito (tarea del
  backend cuando exista ambiente).
- Autenticación: `Authorization: Bearer <jwt>`; el token vive EN MEMORIA
  (ADR-F002). 401 → a login con mensaje de sesión expirada; 403 → pantalla de
  permisos; **429 → mensaje "demasiados intentos" respetando `Retry-After`**
  (el backend tiene rate limiting — HU-022).

## El patrón central: polling de la caja (ADR-F003)

`GET /api/ordenes/{id}` cada 2-3 s mientras la orden esté `PENDIENTE_PAGO`
(el backend responde `Cache-Control: no-store`):

```
crear orden → mostrar QR → poll cada 2.5s ──► PAGO_DETECTADO → PAGADO ✓
                                   │
                                   ├─► EXPIRADA → "expiró, vuelve a cobrar"
                                   └─► error de red → reintento con backoff suave,
                                       indicador de conexión, jamás pantalla rota
```

El polling se detiene al salir de la pantalla (cleanup), al confirmar o al
expirar. Página del pagador: mismo patrón contra `GET /api/pagos/{referencia}`.

## Manejo de estado (ADR-F002)

Signals + servicios. Cada característica tiene a lo sumo un servicio de estado
con signals privados y `computed` públicos. **Prohibido** meter NgRx/librerías
de estado hasta que exista un dolor concreto documentado en un ADR.

## Errores

- `nucleo/api` traduce errores HTTP a un tipo propio (`ErrorDeApi` con
  `mensaje` del backend cuando existe).
- Toda pantalla declara sus 4 estados: cargando / error (con reintento) /
  vacío / éxito. Es parte de la Definition of Done.

## Pruebas (detalle en docs/03)

- **Unitarias/componente**: Vitest + jsdom (servicios de estado, lógica de
  polling con relojes falsos, componentes con TestBed).
- **E2E**: Playwright contra el backend real con proveedor simulado — el flujo
  de la caja completo (cobrar → webhook simulado → PAGADO ✓) es el E2E rey.
