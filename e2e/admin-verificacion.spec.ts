import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { ADMIN_CONTRASENA, ADMIN_EMAIL, API, nitAleatorio } from './ayudas';

/** Registra un comercio SIN verificar (queda PENDIENTE, que es el punto). */
async function comercioPendiente(
  request: APIRequestContext,
  razonSocial: string,
): Promise<{ id: string }> {
  const registro = await request.post(`${API}/api/comercios`, {
    data: {
      razonSocial,
      nit: nitAleatorio(),
      cuentaLiquidacion: {
        banco: 'Nequi',
        tipo: 'AHORROS',
        numero: '3001112233',
        titular: razonSocial,
      },
      credenciales: {
        email: `e2e-adm-${Date.now()}-${Math.random()}@front.co`,
        contrasena: 'secreta-e2e-12345',
      },
    },
  });
  expect(registro.status(), await registro.text()).toBe(201);
  return (await registro.json()) as { id: string };
}

async function entrarComoAdmin(page: Page): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('Correo').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_CONTRASENA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test.describe('HUF-012: verificación de comercios (contra el backend real)', () => {
  test('el admin aprueba un comercio pendiente desde la cola, con confirmación', async ({
    page,
    request,
  }) => {
    const nombre = `Tienda E2E Aprobar ${Date.now()}`;
    await comercioPendiente(request, nombre);

    await entrarComoAdmin(page);

    const fila = page.locator('.cola li', { hasText: nombre });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('Pendiente');

    await fila.getByRole('button', { name: 'Aprobar' }).click();
    await expect(page.getByText(`¿Aprobar a ${nombre}?`)).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(fila).toContainText('Verificado');
  });

  test('rechazar exige motivo y el comercio queda RECHAZADO', async ({ page, request }) => {
    const nombre = `Tienda E2E Rechazar ${Date.now()}`;
    await comercioPendiente(request, nombre);

    await entrarComoAdmin(page);

    const fila = page.locator('.cola li', { hasText: nombre });
    await fila.getByRole('button', { name: 'Rechazar' }).click();

    const confirmar = page.getByRole('button', { name: 'Confirmar' });
    await expect(confirmar).toBeDisabled();
    // getByLabel no sirve aquí: el título del diálogo también dice "motivo"
    await page.getByRole('textbox', { name: 'Motivo' }).fill('Documentos ilegibles (prueba E2E)');
    await expect(confirmar).toBeEnabled();
    await confirmar.click();

    await expect(fila).toContainText('Rechazado');
  });

  test('si otro admin decidió primero, el 409 del backend se muestra tal cual', async ({
    page,
    request,
  }) => {
    const nombre = `Tienda E2E Carrera ${Date.now()}`;
    const { id } = await comercioPendiente(request, nombre);

    await entrarComoAdmin(page);
    const fila = page.locator('.cola li', { hasText: nombre });
    await expect(fila).toContainText('Pendiente');

    // "otro admin" aprueba por API a espaldas de esta pantalla ya cargada
    const login = await request.post(`${API}/api/auth/login`, {
      data: { usuario: ADMIN_EMAIL, contrasena: ADMIN_CONTRASENA },
    });
    const { token } = (await login.json()) as { token: string };
    const decision = await request.post(`${API}/api/comercios/${id}/verificacion`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { decision: 'APROBAR' },
    });
    expect(decision.status()).toBe(200);

    // la pantalla (desactualizada) intenta aprobar de nuevo → 409 visible
    await fila.getByRole('button', { name: 'Aprobar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('alert')).toContainText('PENDIENTE');
  });
});
