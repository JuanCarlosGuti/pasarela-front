import { test, expect } from '@playwright/test';
import { comercioVerificado } from './ayudas';

test.describe('HUF-001: iniciar sesión (contra el backend real)', () => {
  test('con credenciales malas muestra el error genérico y no entra', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(`nadie-${Date.now()}@x.co`);
    await page.getByLabel('Contraseña').fill('clave-mala-12345');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('un comercio verificado entra y llega a la caja lista para cobrar', async ({
    page,
    request,
  }) => {
    // verificado por API (HUF-007 exige aprobación antes de poder cobrar);
    // el flujo "registro → login → pendiente" tiene su propio E2E en registro.spec.ts
    const correo = `e2e-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Front');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/caja/);
    // la caja real (HUF-003/007): el teclado con COBRAR es la señal de haber llegado
    await expect(page.getByRole('button', { name: 'COBRAR' })).toBeVisible();
  });
});
