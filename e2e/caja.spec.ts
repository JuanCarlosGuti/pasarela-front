import { test, expect, APIRequestContext } from '@playwright/test';

const API = 'http://localhost:8080';
const ADMIN_EMAIL = process.env['PASARELA_ADMIN_EMAIL'] ?? 'admin@pasarela.local';
const ADMIN_CONTRASENA = process.env['PASARELA_ADMIN_CONTRASENA'] ?? 'admin-local-12345678';

function nitAleatorio(): string {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41];
  const base = String(Math.floor(Math.random() * 800_000_000) + 100_000_000);
  const suma = base
    .split('')
    .reverse()
    .reduce((acumulado, digito, indice) => acumulado + Number(digito) * pesos[indice], 0);
  const resto = suma % 11;
  const dv = resto < 2 ? resto : 11 - resto;
  return `${base}-${dv}`;
}

/** Prepara por API un comercio VERIFICADO (crear cobro lo exige). */
async function comercioVerificado(request: APIRequestContext, correo: string, contrasena: string) {
  const registro = await request.post(`${API}/api/comercios`, {
    data: {
      razonSocial: 'Tienda E2E Caja',
      nit: nitAleatorio(),
      cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001112233', titular: 'Tienda E2E' },
      credenciales: { email: correo, contrasena },
    },
  });
  expect(registro.status(), await registro.text()).toBe(201);
  const { id } = (await registro.json()) as { id: string };

  const loginAdmin = await request.post(`${API}/api/auth/login`, {
    data: { usuario: ADMIN_EMAIL, contrasena: ADMIN_CONTRASENA },
  });
  expect(loginAdmin.status(), await loginAdmin.text()).toBe(200);
  const { token } = (await loginAdmin.json()) as { token: string };

  const verificacion = await request.post(`${API}/api/comercios/${id}/verificacion`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { decision: 'APROBAR' },
  });
  expect(verificacion.status(), await verificacion.text()).toBe(200);
}

test.describe('HUF-003: crear un cobro (contra el backend real)', () => {
  test('digitar un monto y COBRAR muestra la pantalla de espera con el QR', async ({
    page,
    request,
  }) => {
    const correo = `e2e-caja-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena);

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caja/);

    for (const digito of ['2', '5', '0', '0', '0']) {
      await page.getByRole('button', { name: digito, exact: true }).click();
    }
    await expect(page.getByText('$ 25.000')).toBeVisible();
    await page.getByRole('button', { name: 'COBRAR' }).click();

    await expect(page.getByText('Muestra este código al cliente')).toBeVisible();
    await expect(page.getByText('$ 25.000')).toBeVisible();
    await expect(page.getByText(/Referencia:/)).toBeVisible();
    await expect(page.locator('a.deeplink')).toHaveAttribute('href', /pagar/);
  });
});
