# 04 — Diseño de UI

> La caja compite con "recibir un Nequi": cada toque de más es fricción que
> mata la venta. Diseño austero, grande y obvio.

## Principios

1. **Mobile-first real**: se diseña en 360×640 (Android de gama baja). El
   escritorio es la adaptación, no al revés.
2. **Una pantalla, una decisión.** La caja: digitar monto → COBRAR. Nada más.
3. **Estados imposibles de confundir**: PAGADO ✓ es una pantalla completa
   verde con el monto; EXPIRADA es inconfundible; el error siempre dice qué
   hacer ("Reintentar", "Volver a cobrar").
4. **Legible a un metro**: el monto y el estado se leen con el celular sobre
   el mostrador.
5. **Accesibilidad AA**: contraste ≥ 4.5:1, foco visible, targets ≥ 44px,
   textos reales (no imágenes de texto), `aria-live` para el cambio a PAGADO.

## Tokens (en `compartido/estilos/_tokens.scss`)

| Token | Uso | Valor inicial |
|---|---|---|
| `--color-primario` | acciones (COBRAR) | `#0d47a1` |
| `--color-exito` | PAGADO ✓ | `#1b5e20` |
| `--color-alerta` | expiración próxima | `#e65100` |
| `--color-error` | fallos | `#b71c1c` |
| `--color-fondo` / `--color-texto` | base | `#fafafa` / `#1a1a1a` |
| `--espacio-1..6` | escala de espaciado | 4/8/16/24/32/48 px |
| `--radio` | esquinas | 12px |
| Tipografía | sistema (`system-ui`) — sin fuentes externas en MVP | — |

> Los valores son un punto de partida honesto, no una marca definitiva; se
> ajustan cuando exista identidad visual. Lo innegociable es que TODO pase
> por tokens.

## Los tres flujos clave

**Caja (F2):** teclado numérico propio grande → monto en COP formateado
(`$ 25.000`) → COBRAR → pantalla QR (QR enorme + monto + cuenta regresiva de
expiración) → PAGADO ✓ (verde, monto, hora) / EXPIRADA (rehacer en un toque).

**Pagador (F3):** página pública sobria: monto, estado en vivo, "paga desde tu
app con este QR/botón". Sin marca de terceros, sin datos del comercio más allá
de lo necesario.

**Tablero (F4):** hoy/mes arriba en tarjetas grandes; historial como lista (no
tabla) en móvil; CSV y comprobante a un toque.

## Anti-patrones prohibidos

- Spinners sin texto (siempre "Creando cobro…", "Esperando pago…").
- Modales para errores de red (se muestran en la propia pantalla, con acción).
- Deshabilitar botones sin explicar por qué.
- Jerga técnica en mensajes ("Error 500" → "No pudimos crear el cobro. Reintenta").
