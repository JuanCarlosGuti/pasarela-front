import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

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
        cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001112233', titular: 'Tienda E2E' },
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
        cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001112233', titular: 'Tienda E2E' },
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
