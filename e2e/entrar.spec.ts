import { test, expect } from '@playwright/test';
import { API, nitAleatorio } from './ayudas';

test.describe('HUF-001: iniciar sesión (contra el backend real)', () => {
  test('con credenciales malas muestra el error genérico y no entra', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(`nadie-${Date.now()}@x.co`);
    await page.getByLabel('Contraseña').fill('clave-mala-12345');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('un comercio recién registrado entra y llega a la caja', async ({ page, request }) => {
    // preparación por API (el registro es público); la UI de registro llega en F3
    const correo = `e2e-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    const registro = await request.post(`${API}/api/comercios`, {
      data: {
        razonSocial: 'Tienda E2E Front',
        nit: nitAleatorio(),
        cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001112233', titular: 'Tienda E2E' },
        credenciales: { email: correo, contrasena },
      },
    });
    expect(registro.status(), await registro.text()).toBe(201);

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/caja/);
    // la caja real (HUF-003): el teclado con COBRAR es la señal de haber llegado
    await expect(page.getByRole('button', { name: 'COBRAR' })).toBeVisible();
  });
});
