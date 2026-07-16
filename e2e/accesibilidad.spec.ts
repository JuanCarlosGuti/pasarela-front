import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { comercioVerificado } from './ayudas';

/**
 * TF-004: auditoría AA automatizada (axe-core) de los flujos clave.
 * Se limita a WCAG 2.x niveles A y AA — el criterio literal del backlog.
 * Cualquier violación rompe la prueba con el detalle completo.
 */
async function sinViolacionesAA(page: Page): Promise<void> {
  const resultados = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    resultados.violations.map((violacion) => ({
      regla: violacion.id,
      impacto: violacion.impact,
      nodos: violacion.nodes.map((nodo) => nodo.html),
    })),
  ).toEqual([]);
}

test.describe('TF-004: accesibilidad AA (axe, contra el backend real)', () => {
  test('flujo 1 — entrar: el login pasa AA', async ({ page }) => {
    await page.goto('/entrar');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await sinViolacionesAA(page);
  });

  test('flujo 2 — la caja: teclado, QR y espera pasan AA', async ({ page, request }) => {
    const correo = `e2e-a11y-caja-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E A11y');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caja/);
    await sinViolacionesAA(page); // el teclado de cobro

    for (const digito of ['2', '5', '0', '0', '0']) {
      await page.getByRole('button', { name: digito, exact: true }).click();
    }
    await page.getByRole('button', { name: 'COBRAR' }).click();
    await expect(page.getByText('Muestra este código al cliente')).toBeVisible();
    await sinViolacionesAA(page); // la pantalla del QR / espera del pago
  });

  test('flujo 3 — registro del comercio: el formulario pasa AA', async ({ page }) => {
    await page.goto('/registro');
    await expect(page.getByRole('button', { name: /Registr/ })).toBeVisible();
    await sinViolacionesAA(page);
  });

  test('el tablero y el panel admin también pasan AA', async ({ page, request }) => {
    const correo = `e2e-a11y-tablero-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E A11y Tablero');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Tu negocio' }).click();
    await expect(page).toHaveURL(/\/tablero/);
    await expect(page.getByText('Tus liquidaciones')).toBeVisible();
    await sinViolacionesAA(page);
  });
});

test.describe('TF-004: teclado y almacenamiento (contra el backend real)', () => {
  test('el login completo se puede hacer SOLO con teclado', async ({ page, request }) => {
    const correo = `e2e-teclado-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Teclado');

    await page.goto('/entrar');
    // sin un solo clic: Tab hasta el correo, escribir, Tab, escribir, Enter
    await page.keyboard.press('Tab');
    let enfocado = await page.evaluate(() => document.activeElement?.getAttribute('name'));
    while (enfocado !== 'usuario') {
      await page.keyboard.press('Tab');
      enfocado = await page.evaluate(() => document.activeElement?.getAttribute('name'));
    }
    await page.keyboard.type(correo);
    await page.keyboard.press('Tab');
    await page.keyboard.type(contrasena);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/caja/);
  });

  test('tras el login, NO hay token en storage, cookies ni URL (ADR-F002)', async ({
    page,
    request,
  }) => {
    const correo = `e2e-storage-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Storage');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caja/);

    const almacenamiento = await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
    }));
    // un JWT se delata por su prefijo base64 del header {"alg":...}
    expect(almacenamiento.local).not.toContain('eyJ');
    expect(almacenamiento.session).not.toContain('eyJ');

    const cookies = await page.context().cookies();
    expect(cookies.filter((cookie) => cookie.value.includes('eyJ'))).toEqual([]);

    expect(page.url()).not.toContain('eyJ');
    expect(page.url()).not.toContain('token');
  });
});
