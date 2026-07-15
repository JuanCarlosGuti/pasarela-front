import { defineConfig } from '@playwright/test';

/**
 * E2E contra el sistema REAL: el backend local (perfil local + proveedor
 * simulado) debe estar arriba en :8080 — ver README. Playwright levanta el
 * dev server de Angular (con su proxy /api) si no está corriendo.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  // Todos los E2E comparten IP (localhost) frente al rate limiting por IP
  // del backend (HU-022, login.maximo=10/60s): con más de un worker, varios
  // archivos hacen login en paralelo y agotan el cupo entre todos. Un solo
  // worker mantiene el volumen de logins realista para el límite local.
  workers: 1,
  use: {
    baseURL: 'http://localhost:4200',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
