import { test, expect } from '@playwright/test';
import { API, nitAleatorio } from './ayudas';

test.describe('HUF-002: sesión y guardas (contra el backend real)', () => {
  test('sin sesión, la caja redirige a entrar', async ({ page }) => {
    await page.goto('/caja');
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('recargar la página pierde la sesión a propósito (ADR-F002)', async ({ page, request }) => {
    const correo = `e2e-recarga-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await request.post(`${API}/api/comercios`, {
      data: {
        razonSocial: 'Tienda E2E Sesion',
        nit: nitAleatorio(),
        cuentaLiquidacion: {
          banco: 'Nequi',
          tipo: 'AHORROS',
          numero: '3001112233',
          titular: 'Tienda E2E',
        },
        credenciales: { email: correo, contrasena },
      },
    });
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caja/);

    await page.reload();

    await expect(page).toHaveURL(/\/entrar/);
  });

  test('el botón Salir cierra la sesión y protege la caja de nuevo', async ({ page, request }) => {
    const correo = `e2e-salir-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await request.post(`${API}/api/comercios`, {
      data: {
        razonSocial: 'Tienda E2E Salir',
        nit: nitAleatorio(),
        cuentaLiquidacion: {
          banco: 'Nequi',
          tipo: 'AHORROS',
          numero: '3001112233',
          titular: 'Tienda E2E',
        },
        credenciales: { email: correo, contrasena },
      },
    });
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caja/);

    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/entrar/);

    await page.goto('/caja');
    await expect(page).toHaveURL(/\/entrar/);
  });
});
