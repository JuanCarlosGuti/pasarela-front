import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { API, comercioVerificado } from './ayudas';

const SECRETO_WEBHOOK =
  process.env['PASARELA_SIM_SECRETO_WEBHOOK'] ?? 'secreto-webhook-simulado-local';

test.describe('HUF-003: crear un cobro (contra el backend real)', () => {
  test('digitar un monto y COBRAR muestra la pantalla de espera con el QR', async ({
    page,
    request,
  }) => {
    const correo = `e2e-caja-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Caja');

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

  test('EL E2E REY: el webhook del simulador paga y PAGADO ✓ aparece solo', async ({
    page,
    request,
  }) => {
    const correo = `e2e-rey-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Rey');

    // el cajero cobra $18.000 desde el navegador
    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    for (const digito of ['1', '8', '0', '0', '0']) {
      await page.getByRole('button', { name: digito, exact: true }).click();
    }
    await page.getByRole('button', { name: 'COBRAR' }).click();
    await expect(page.locator('.qr-imagen svg')).toBeVisible(); // QR real en pantalla

    // el "pagador" (simulador) confirma por webhook FIRMADO, como en producción
    const textoReferencia = await page.getByText(/Referencia:/).textContent();
    const referencia = textoReferencia!.replace('Referencia:', '').trim();
    const cuerpo = JSON.stringify({
      idEvento: `evt-e2e-rey-${Date.now()}`,
      tipo: 'PAGO_RECIBIDO',
      referencia,
      monto: 18000,
      pagadoEn: new Date().toISOString(),
    });
    const firma = createHmac('sha256', SECRETO_WEBHOOK).update(cuerpo, 'utf8').digest('hex');
    const webhook = await request.post(`${API}/api/webhooks/simulado`, {
      headers: { 'X-Firma': firma, 'Content-Type': 'application/json' },
      data: cuerpo,
    });
    expect(webhook.status(), await webhook.text()).toBe(200);
    expect(((await webhook.json()) as { resultado: string }).resultado).toBe('CONFIRMADO');

    // sin tocar nada: el sondeo (ADR-F003) trae el desenlace a la pantalla
    await expect(page.getByText('PAGADO')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('$ 18.000')).toBeVisible();

    // y el cajero queda listo para el siguiente cliente
    await page.getByRole('button', { name: 'Nuevo cobro' }).click();
    await expect(page.getByRole('button', { name: 'COBRAR' })).toBeVisible();
  });
});
