import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { API, comercioVerificado } from './ayudas';

const SECRETO_WEBHOOK =
  process.env['PASARELA_SIM_SECRETO_WEBHOOK'] ?? 'secreto-webhook-simulado-local';

// El 422 de una orden sin pagar ya queda cubierto por el test de componente
// (pagina-comprobante.spec.ts) con el mensaje literal del backend: la UI no
// ofrece ningún enlace a una orden sin pagar (tieneComprobante() la filtra),
// así que no hay un camino de clics reales para reproducirlo en E2E — y
// forzarlo con page.goto tras login perdería la sesión (ADR-F002: reload =
// logout; guardaDeRol no preserva la URL de destino).
test.describe('HUF-011: comprobante de venta (contra el backend real)', () => {
  test('desde el historial, una venta pagada abre un comprobante imprimible', async ({
    page,
    request,
  }) => {
    const correo = `e2e-comp-ok-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Comprobante');

    const login = await request.post(`${API}/api/auth/login`, {
      data: { usuario: correo, contrasena },
    });
    const { token } = (await login.json()) as { token: string };
    const orden = await request.post(`${API}/api/ordenes`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { monto: 33000 },
    });
    const { referencia } = (await orden.json()) as { referencia: string };
    const cuerpo = JSON.stringify({
      idEvento: `evt-e2e-comprobante-${Date.now()}`,
      tipo: 'PAGO_RECIBIDO',
      referencia,
      monto: 33000,
      pagadoEn: new Date().toISOString(),
    });
    const firma = createHmac('sha256', SECRETO_WEBHOOK).update(cuerpo, 'utf8').digest('hex');
    await request.post(`${API}/api/webhooks/simulado`, {
      headers: { 'X-Firma': firma, 'Content-Type': 'application/json' },
      data: cuerpo,
    });

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Tu negocio' }).click();
    await expect(page).toHaveURL(/\/tablero/);

    const fila = page.locator('table tbody tr', { hasText: '$ 33.000' });
    await expect(fila).toBeVisible();
    await fila.getByRole('link', { name: 'Comprobante' }).click();

    await expect(page).toHaveURL(/\/comprobante\//);
    await expect(page.getByRole('heading', { name: 'Comprobante de venta' })).toBeVisible();
    await expect(page.getByText('$ 33.000')).toBeVisible();
    await expect(page.getByText(referencia)).toBeVisible();
    await expect(page.getByText('Aún no liquidada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Imprimir' })).toBeVisible();
  });
});
