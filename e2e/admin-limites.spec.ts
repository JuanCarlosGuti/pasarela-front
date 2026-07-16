import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { API, nitAleatorio } from './ayudas';

const ADMIN_EMAIL = process.env['PASARELA_ADMIN_EMAIL'] ?? 'admin@pasarela.local';
const ADMIN_CONTRASENA = process.env['PASARELA_ADMIN_CONTRASENA'] ?? 'admin-local-12345678';

async function comercioPendiente(request: APIRequestContext, razonSocial: string): Promise<void> {
  const registro = await request.post(`${API}/api/comercios`, {
    data: {
      razonSocial,
      nit: nitAleatorio(),
      cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001112233', titular: razonSocial },
      credenciales: {
        email: `e2e-lim-${Date.now()}-${Math.random()}@front.co`,
        contrasena: 'secreta-e2e-12345',
      },
    },
  });
  expect(registro.status(), await registro.text()).toBe(201);
}

async function entrarComoAdmin(page: Page): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_CONTRASENA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test.describe('HUF-013: límites por comercio (contra el backend real)', () => {
  test('el admin ajusta los topes y la fila muestra los nuevos valores', async ({
    page,
    request,
  }) => {
    const nombre = `Tienda E2E Limites ${Date.now()}`;
    await comercioPendiente(request, nombre);

    await entrarComoAdmin(page);
    const fila = page.locator('.cola li', { hasText: nombre });
    // topes por defecto del backend, visibles antes de tocar nada
    await expect(fila).toContainText('Tope $ 2.000.000');

    await fila.getByRole('button', { name: 'Límites' }).click();
    await page.getByRole('spinbutton', { name: 'Tope por transacción' }).fill('500000');
    await page.getByRole('spinbutton', { name: 'Tope mensual' }).fill('5000000');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(fila).toContainText('Tope $ 500.000');
    await expect(fila).toContainText('Mes $ 5.000.000');
  });

  test('un tope por transacción mayor al mensual muestra el 400 del backend', async ({
    page,
    request,
  }) => {
    const nombre = `Tienda E2E Limites 400 ${Date.now()}`;
    await comercioPendiente(request, nombre);

    await entrarComoAdmin(page);
    const fila = page.locator('.cola li', { hasText: nombre });
    await fila.getByRole('button', { name: 'Límites' }).click();

    await page.getByRole('spinbutton', { name: 'Tope por transacción' }).fill('9000000');
    await page.getByRole('spinbutton', { name: 'Tope mensual' }).fill('1000000');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByRole('alert')).toContainText('tope');
  });
});
