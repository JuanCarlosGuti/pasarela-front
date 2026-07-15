import { test, expect } from '@playwright/test';
import { comercioVerificado } from './ayudas';

test.describe('HUF-005: cobros de hoy (contra el backend real)', () => {
  test('con la jornada vacía, muestra el mensaje amable', async ({ page, request }) => {
    const correo = `e2e-hist-vacio-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Historial Vacío');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caja/);

    await page.getByRole('button', { name: 'Ver cobros de hoy' }).click();
    await expect(page.getByText('Aún no has cobrado hoy')).toBeVisible();

    await page.getByRole('button', { name: 'Volver a cobrar' }).click();
    await expect(page.getByRole('button', { name: 'COBRAR' })).toBeVisible();
  });

  test('un cobro creado aparece en el historial con su estado', async ({ page, request }) => {
    const correo = `e2e-hist-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Historial');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    for (const digito of ['3', '3', '0', '0', '0']) {
      await page.getByRole('button', { name: digito, exact: true }).click();
    }
    await page.getByRole('button', { name: 'COBRAR' }).click();
    await expect(page.getByText('Muestra este código al cliente')).toBeVisible();

    await page.getByRole('button', { name: 'Volver a la caja' }).click();
    await page.getByRole('button', { name: 'Ver cobros de hoy' }).click();

    const fila = page.locator('li.orden', { hasText: '$ 33.000' });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('Pendiente');

    await fila.getByRole('button').click();
    await expect(page.locator('.detalle')).toContainText('PENDIENTE_PAGO');
  });
});
