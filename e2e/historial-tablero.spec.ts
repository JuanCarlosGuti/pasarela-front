import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { API, comercioVerificado } from './ayudas';

const SECRETO_WEBHOOK =
  process.env['PASARELA_SIM_SECRETO_WEBHOOK'] ?? 'secreto-webhook-simulado-local';

test.describe('HUF-009: historial del tablero (contra el backend real)', () => {
  test('un cobro pagado aparece en el historial del tablero, con filtro por fecha', async ({
    page,
    request,
  }) => {
    const correo = `e2e-hist-tablero-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Historial Tablero');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();

    const loginComercio = await request.post(`${API}/api/auth/login`, {
      data: { usuario: correo, contrasena },
    });
    const { token } = (await loginComercio.json()) as { token: string };
    const orden = await request.post(`${API}/api/ordenes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { monto: 64000 },
    });
    const { referencia } = (await orden.json()) as { referencia: string };
    const cuerpo = JSON.stringify({
      idEvento: `evt-e2e-hist-tablero-${Date.now()}`,
      tipo: 'PAGO_RECIBIDO',
      referencia,
      monto: 64000,
      pagadoEn: new Date().toISOString(),
    });
    const firma = createHmac('sha256', SECRETO_WEBHOOK).update(cuerpo, 'utf8').digest('hex');
    await request.post(`${API}/api/webhooks/simulado`, {
      headers: { 'X-Firma': firma, 'Content-Type': 'application/json' },
      data: cuerpo,
    });

    await page.getByRole('link', { name: 'Tu negocio' }).click();
    await expect(page).toHaveURL(/\/tablero/);

    const fila = page.locator('table tbody tr', { hasText: '$ 64.000' });
    await expect(fila).toBeVisible();
    await expect(fila).toContainText('Pagado');

    // filtro con rango que excluye hoy: no debe aparecer
    await page.getByLabel('Desde').fill('2020-01-01');
    await page.getByLabel('Hasta').fill('2020-01-31');
    await page.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page.getByText('No hay movimientos en este rango')).toBeVisible();
  });
});
