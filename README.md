# Pasarela de Pagos Cripto — Frontend

Frontend web (Angular 22, mobile-first) de la pasarela que permite a comercios
en Colombia cobrar en cripto y recibir COP. El backend vive en el repo
[`pasarela-Cripto`](https://github.com/JuanCarlosGuti/pasarela-Cripto).

## Empezar

```bash
# 1. Backend local (repo hermano): PostgreSQL + API con proveedor simulado
#    cd ../pagos && docker compose up -d && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 2. Front
npm install
npm start          # http://localhost:4200 (proxy /api → localhost:8080)

# Pruebas
npm test           # Vitest
```

## Documentación (leer antes de tocar código)

Todo el contexto, las reglas y el plan viven en [`CLAUDE.md`](CLAUDE.md) y
[`docs/`](docs/): visión y alcance, arquitectura, guía de estilo y pruebas,
diseño UI, ADRs y la gestión (flujo git, **backlog de historias** y plan de
sprints F0–F5).
