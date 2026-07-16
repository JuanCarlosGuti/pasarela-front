import { test, expect } from '@playwright/test';
import { comercioVerificado } from './ayudas';

// La lista con datos (HU-025, backend) ya la cubre LiquidacionesApiTest y el
// desglose en pantalla ya lo cubre el test de componente de
// LiquidacionesSimuladas: NO hay forma de reproducirlo aquí porque hoy no
// existe ningun disparador HTTP real que lleve una orden a CONVERTIDA — el
// backend solo procesa webhooks "PAGO_RECIBIDO"; "conversion detectada" es
// un hueco pre-existente del sistema (documentado en el propio backend,
// coleccion-api/05-liquidaciones), no algo de esta historia. Forzarlo aqui
// significaria inventar un endpoint que no existe en produccion.
test.describe('HUF-014: liquidaciones simuladas (contra el backend real)', () => {
  test('sin liquidaciones, el tablero muestra el mensaje vacío con la etiqueta Simulado', async ({
    page,
    request,
  }) => {
    const correo = `e2e-liq-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E Liquidaciones');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Tu negocio' }).click();
    await expect(page).toHaveURL(/\/tablero/);

    await expect(page.getByText('Tus liquidaciones')).toBeVisible();
    await expect(page.getByText('Simulado')).toBeVisible();
    await expect(page.getByText('Aún no tienes liquidaciones')).toBeVisible();
  });
});
