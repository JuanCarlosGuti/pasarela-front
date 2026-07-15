# ADR-F003 — "PAGADO ✓" por polling corto (herencia del ADR-005 del backend)

**Estado:** Aceptado

## Contexto

La caja necesita enterarse de que el pago llegó. El backend ya decidió el
mecanismo (ADR-005 del repo `pasarela-Cripto`): **polling corto** sobre
`GET /api/ordenes/{id}` (caja) y `GET /api/pagos/{referencia}` (pagador),
ambos con `Cache-Control: no-store`. Sin SSE ni WebSockets en el MVP.

## Decisión

Implementar el polling en el front como un servicio único reutilizable
(`SondeoDeOrden`): intervalo 2.5 s, solo mientras el estado sea no terminal,
con detención automática al confirmar/expirar/salir de la pantalla, y backoff
suave + indicador de conexión ante errores de red (el polling nunca revienta
la UI). Respetar `Retry-After` si el backend responde 429.

## Consecuencias

- Confirmación visible ≤ ~3 s tras el webhook — suficiente para el mostrador.
- Cero infraestructura nueva; el patrón es idéntico para caja y pagador.
- Si el piloto exige tiempo real (multi-caja, kiosco), el cambio será SSE/push
  en AMBOS repos con un nuevo par de ADRs.
