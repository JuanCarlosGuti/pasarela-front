import { test, expect } from '@playwright/test';
import { nitAleatorio } from './ayudas';

test.describe('HUF-007: registro de comercio (contra el backend real)', () => {
  test('registro → login → el comercio ve que está en verificación', async ({ page }) => {
    const correo = `e2e-registro-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';

    await page.goto('/registro');
    await page.getByLabel('Razón social').fill('Café E2E Registro');
    await page.getByLabel('NIT').fill(nitAleatorio());
    await page.getByLabel('Tipo de cuenta').selectOption('NEQUI');
    await page.getByLabel('Número de cuenta').fill('3001234567');
    await page.getByLabel('Titular de la cuenta').fill('Café E2E Registro');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(contrasena);
    await page.getByLabel('Confirma la contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Registrar mi comercio' }).click();

    await expect(page.getByText('Tu comercio está en verificación')).toBeVisible();

    await page.getByRole('link', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/entrar/);
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // el comercio recién registrado (PENDIENTE) ve el aviso, no el teclado
    await expect(page).toHaveURL(/\/caja/);
    await expect(page.getByText('Tu comercio está en verificación')).toBeVisible();
    await expect(page.getByRole('button', { name: 'COBRAR' })).not.toBeVisible();
  });

  test('un NIT ya registrado muestra el mensaje del backend (409)', async ({ page }) => {
    const nit = nitAleatorio();
    const nombre = `Café E2E Duplicado ${Date.now()}`;

    async function registrar(correo: string) {
      await page.goto('/registro');
      await page.getByLabel('Razón social').fill(nombre);
      await page.getByLabel('NIT').fill(nit);
      await page.getByLabel('Número de cuenta').fill('3001234567');
      await page.getByLabel('Titular de la cuenta').fill(nombre);
      await page.getByLabel('Correo').fill(correo);
      await page.getByLabel('Contraseña', { exact: true }).fill('secreta-e2e-12345');
      await page.getByLabel('Confirma la contraseña').fill('secreta-e2e-12345');
      await page.getByRole('button', { name: 'Registrar mi comercio' }).click();
    }

    await registrar(`e2e-dup-1-${Date.now()}@front.co`);
    await expect(page.getByText('Tu comercio está en verificación')).toBeVisible();

    await registrar(`e2e-dup-2-${Date.now()}@front.co`);
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

test.describe('HUF-015: navegación pública y confirmación de contraseña', () => {
  test('sin sesión se llega a registro desde la cabecera y de vuelta a entrar', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/entrar/);

    // cabecera pública: Entrar y Registro siempre a un toque
    await page.locator('header').getByRole('link', { name: 'Registro' }).click();
    await expect(page).toHaveURL(/\/registro/);

    // y desde el formulario, el camino de vuelta
    await page.getByRole('link', { name: 'Inicia sesión' }).click();
    await expect(page).toHaveURL(/\/entrar/);

    // el login también ofrece el registro
    await page.getByRole('link', { name: 'Registra tu comercio' }).click();
    await expect(page).toHaveURL(/\/registro/);
  });

  test('contraseñas distintas avisan y el registro no se envía', async ({ page }) => {
    await page.goto('/registro');
    await page.getByLabel('Razón social').fill('Café E2E Confirmación');
    await page.getByLabel('NIT').fill(nitAleatorio());
    await page.getByLabel('Número de cuenta').fill('3001234567');
    await page.getByLabel('Titular de la cuenta').fill('Café E2E Confirmación');
    await page.getByLabel('Correo').fill(`e2e-conf-${Date.now()}@front.co`);
    await page.getByLabel('Contraseña', { exact: true }).fill('secreta-e2e-12345');
    await page.getByLabel('Confirma la contraseña').fill('otra-distinta-999');

    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
    await expect(page.getByText('Mínimo 8 caracteres')).toBeVisible();

    await page.getByRole('button', { name: 'Registrar mi comercio' }).click();
    // sigue en el formulario: nada viajó al backend
    await expect(page.getByText('Tu comercio está en verificación')).not.toBeVisible();
    await expect(page).toHaveURL(/\/registro/);
  });
});
