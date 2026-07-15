# Gestión 01 — Flujo de trabajo Git (frontend)

> Mismo GitFlow simplificado del backend, con nomenclatura propia del front.

## Ramas

- `main`: solo recibe merges de cierre de sprint (vía Pull Request con CI
  verde). Cada cierre se tagea.
- `develop`: integración continua de historias terminadas.
- `feature/HUF-xxx-descripcion` (o `feature/TF-xxx-...` para tareas técnicas):
  una rama por historia, desde `develop`, merge con `--no-ff`.

Nunca commitear directo a `main` ni `develop`.

## Commits

Conventional Commits en español:

```
feat(caja): pantalla de cobro con teclado de monto
fix(nucleo): el interceptor renueva el estado tras 401
docs(gestion): completar HUF-004
test(caja): sondeo de orden con temporizadores falsos
chore(ci): cachear node_modules
```

## Ciclo de una historia

1. Backlog: ⬜ → 🔵 + rama `feature/HUF-xxx`.
2. TDD: pruebas primero; implementación; `npm test` + lint verdes.
3. Demo en vivo contra el backend local (con proveedor simulado).
4. Commit(s) + push de la rama (respaldo diario).
5. Merge `--no-ff` a `develop` + backlog 🔵 → ✅
   (`docs(gestion): completar HUF-xxx`).

## Cierre de sprint

- Tabla de sprints actualizada + PR `develop` → `main` con CI verde.
- Tag anotado **`vF0.<sprint>.0`** con retro de 3 líneas (qué funcionó, qué
  estorbó, qué cambiamos).
