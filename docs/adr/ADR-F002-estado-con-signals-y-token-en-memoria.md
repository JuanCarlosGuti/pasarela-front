# ADR-F002 — Estado con signals/servicios y JWT solo en memoria

**Estado:** Aceptado

## Contexto

Dos decisiones que definen la complejidad del cliente: cómo se maneja el
estado y dónde vive el token de sesión.

## Decisión

1. **Estado:** signals + servicios por característica. Un servicio de estado
   por feature (signals privados, `computed` públicos, métodos con nombre de
   negocio — espejo de "sin setters públicos" del dominio backend). **Ninguna
   librería de estado (NgRx/Akita/etc.) hasta que un dolor concreto lo
   justifique en un nuevo ADR.**
2. **JWT solo en memoria** (variable del `SesionService`), nunca en
   `localStorage`/`sessionStorage`: el XSS que pudiera leer storage no
   encuentra token persistido. Costo asumido: al recargar la página se vuelve
   a iniciar sesión. Para la caja (una pestaña abierta todo el día) es un
   costo bajo; si el piloto demuestra que molesta, se evaluará refresh token
   HttpOnly **del lado del backend** (nunca guardar el JWT en storage como
   atajo).

## Consecuencias

- Cliente simple y auditable; el flujo de datos se lee sin herramientas.
- Recarga = login: documentado como comportamiento esperado en el MVP.
- Los interceptores toman el token del servicio; ningún otro código lo toca.
