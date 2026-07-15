import { test, expect } from '@playwright/test';

const API = 'http://localhost:8080';

/** NIT aleatorio con dígito de verificación DIAN válido (el backend valida). */
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
    await expect(page.getByRole('heading', { name: 'La caja' })).toBeVisible();
  });
});
