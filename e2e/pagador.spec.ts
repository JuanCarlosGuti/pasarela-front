import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { API, comercioVerificado } from './ayudas';

const SECRETO_WEBHOOK =
  process.env['PASARELA_SIM_SECRETO_WEBHOOK'] ?? 'secreto-webhook-simulado-local';

test.describe('HUF-006: página pública del pagador (contra el backend real)', () => {
  test('una referencia inexistente muestra "Este pago no existe"', async ({ page }) => {
    await page.goto('/pagar/referencia-que-no-existe');
    await expect(page.getByText('Este pago no existe')).toBeVisible();
  });

  test('el pagador ve el pago pendiente y luego PAGADO ✓, sin sesión', async ({
    page,
    request,
  }) => {
    const correo = `e2e-pagador-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Pagador');

    // el cajero crea el cobro (por API: no gastamos otro login en el navegador)
    const loginComercio = await request.post(`${API}/api/auth/login`, {
      data: { usuario: correo, contrasena },
    });
    const { token } = (await loginComercio.json()) as { token: string };
    const orden = await request.post(`${API}/api/ordenes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { monto: 42000 },
    });
    const { referencia } = (await orden.json()) as { referencia: string };

    // el pagador abre el link SIN iniciar sesión
    await page.goto(`/pagar/${referencia}`);
    await expect(page.getByText('$ 42.000')).toBeVisible();
    await expect(page.getByText(/Esperando confirmación/)).toBeVisible();

    const cuerpo = JSON.stringify({
      idEvento: `evt-e2e-pagador-${Date.now()}`,
      tipo: 'PAGO_RECIBIDO',
      referencia,
      monto: 42000,
      pagadoEn: new Date().toISOString(),
    });
    const firma = createHmac('sha256', SECRETO_WEBHOOK).update(cuerpo, 'utf8').digest('hex');
    const webhook = await request.post(`${API}/api/webhooks/simulado`, {
      headers: { 'X-Firma': firma, 'Content-Type': 'application/json' },
      data: cuerpo,
    });
    expect(webhook.status(), await webhook.text()).toBe(200);

    await expect(page.getByText('PAGADO')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('$ 42.000')).toBeVisible();
  });
});
