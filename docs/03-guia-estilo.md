# 03 — Guía de estilo y pruebas (frontend)

> Mismo espíritu del backend: código que se explica solo, en español, con
> pruebas primero.

## Nombres y lenguaje

- **Todo en español**: `PantallaDeCobro`, `SesionService`, `montoEnCop`,
  `estaExpirada`. El lenguaje ubicuo del dominio (orden, referencia, comercio,
  comprobante) es el mismo del backend — no traducir ni inventar sinónimos.
- Archivos: kebab-case (`pantalla-de-cobro.ts`); una clase por archivo.
- Prohibido `any`. `strict` completo en tsconfig (ya activo).

## Componentes

- Standalone siempre; cortos (< ~150 líneas); si crecen, extraer hijos o
  mover lógica a un servicio.
- Presentación separada de estado: el componente lee signals del servicio de
  su característica; no hace HTTP directamente.
- Inputs/outputs tipados con las APIs de signals (`input()`, `output()`).
- Cada componente maneja sus 4 estados de UI (cargando/error/vacío/éxito).

## TDD y pruebas

- **Primero la prueba.** Historia sin pruebas = historia sin terminar.
- Unitarias (Vitest): servicios de estado y lógica pura — el polling se prueba
  con temporizadores falsos (`vi.useFakeTimers`), nunca con esperas reales.
- Componentes: TestBed + jsdom; se prueba comportamiento visible (textos,
  aria, clicks), no detalles internos.
- E2E (Playwright, desde F1): los caminos felices de cada sprint + los caminos
  tristes que el usuario puede ver (sesión expirada, 429, proveedor caído).
- Sin red real en unitarias: HTTP siempre con `provideHttpClientTesting`.

## Estilo visual y SCSS

- Tokens de diseño en `compartido/estilos/` (`_tokens.scss`): colores,
  tipografía, espaciado, radios. **Ningún color/tamaño hardcodeado** en
  componentes: todo sale de tokens.
- Mobile-first: los estilos base son para 360px; `@media (min-width:)` para
  crecer, nunca al revés.
- Sin frameworks CSS en el MVP; utilidades propias mínimas.

## Commits, ramas y DoD

- Conventional Commits en español (`feat(caja): ...`, `docs(gestion): ...`).
- Rama `feature/HUF-xxx-descripcion` desde `develop`; merge con `--no-ff`.
- **Definition of Done**: criterios de la HU cumplidos · pruebas verdes en CI ·
  lint/format limpios · estados de UI completos · accesible con teclado ·
  demo en vivo contra el backend local · backlog actualizado.
