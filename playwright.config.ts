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
