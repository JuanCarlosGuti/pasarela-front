# 01 — Visión y alcance del MVP (frontend)

> El backend ya cobra, confirma, concilia y reporta (repo `pasarela-Cripto`,
> v0.6.0). Este frontend es la capa que lo vuelve **usable por un tendero**:
> si la caja no se entiende en 10 segundos, el producto no existe.

## Usuarios y sus momentos de verdad

| Usuario | Momento de verdad | Pantalla |
|---|---|---|
| **Cajero/dueño del comercio** | "Digito 25.000, muestro el QR, veo PAGADO ✓ y entrego el café" | La caja |
| **Pagador** | "Escaneo, pago desde mi app, veo confirmado" | Página pública del pago |
| **Dueño (fin de mes)** | "¿Cuánto vendí? Le mando el CSV al contador" | Tablero |
| **Admin (nosotros)** | "Apruebo un comercio en minutos" | Admin |

## Alcance del MVP (Sprints F0–F5)

1. **F0 — Fundaciones**: esqueleto, CI, documentación, tokens de diseño.
2. **F1 — Autenticación**: login JWT, sesión, expiración, guardas por rol.
3. **F2 — La caja** (el corazón): monto → QR → espera → **PAGADO ✓** por
   polling · expiración visible · errores humanos (proveedor caído, sin red).
4. **F3 — Pagador y onboarding**: página pública `/pagar/:referencia` +
   registro del comercio con estado "en verificación".
5. **F4 — Tablero**: resumen día/mes, historial paginado, export CSV,
   comprobante imprimible.
6. **F5 — Admin y endurecimiento**: verificación de comercios, límites,
   accesibilidad AA, revisión de seguridad del cliente.

## Fuera de alcance del MVP

- Apps nativas (es una web mobile-first; PWA se evalúa post-MVP).
- Notificaciones push (el polling del ADR-005/ADR-F003 resuelve el MVP).
- Multi-idioma (español Colombia únicamente).
- Personalización visual por comercio.

## Criterios de éxito del MVP front

- Un tendero **sin capacitación** completa un cobro en < 20 segundos.
- La caja funciona en un Android de gama baja con datos móviles.
- "PAGADO ✓" aparece en ≤ 3 s tras la confirmación del backend (un ciclo de polling).
- Cualquier error tiene mensaje en español claro y acción sugerida.
