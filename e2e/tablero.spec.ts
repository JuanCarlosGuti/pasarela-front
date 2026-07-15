import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { API, comercioVerificado } from './ayudas';

const SECRETO_WEBHOOK =
  process.env['PASARELA_SIM_SECRETO_WEBHOOK'] ?? 'secreto-webhook-simulado-local';

test.describe('HUF-008: ventas de hoy y del mes (contra el backend real)', () => {
  test('arranca en $0 y sube tras pagar una venta', async ({ page, request }) => {
    const correo = `e2e-tablero-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Tablero');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caja/);

    // navegar por el link (in-SPA): un page.goto haría recarga completa y,
    // por ADR-F002 (token solo en memoria), perdería la sesión
    await page.getByRole('link', { name: 'Tu negocio' }).click();
    await expect(page).toHaveURL(/\/tablero/);
    await expect(page.getByText('$ 0')).toHaveCount(2);

    // vender por API (más rápido) y pagar con webhook firmado
    const loginComercio = await request.post(`${API}/api/auth/login`, {
      data: { usuario: correo, contrasena },
    });
    const { token } = (await loginComercio.json()) as { token: string };
    const orden = await request.post(`${API}/api/ordenes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { monto: 55000 },
    });
    const { referencia } = (await orden.json()) as { referencia: string };
    const cuerpo = JSON.stringify({
      idEvento: `evt-e2e-tablero-${Date.now()}`,
      tipo: 'PAGO_RECIBIDO',
      referencia,
      monto: 55000,
      pagadoEn: new Date().toISOString(),
    });
    const firma = createHmac('sha256', SECRETO_WEBHOOK).update(cuerpo, 'utf8').digest('hex');
    await request.post(`${API}/api/webhooks/simulado`, {
      headers: { 'X-Firma': firma, 'Content-Type': 'application/json' },
      data: cuerpo,
    });

    // volver a la pestaña dispara el refresco (HUF-008)
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.getByText('$ 55.000')).toHaveCount(2); // hoy y mes
  });
});
