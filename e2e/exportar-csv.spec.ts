import { test, expect } from '@playwright/test';
import { comercioVerificado } from './ayudas';

test.describe('HUF-010: exportar CSV (contra el backend real)', () => {
  test('descarga movimientos.csv con BOM y separador ";" (contador-ready)', async ({
    page,
    request,
  }) => {
    const correo = `e2e-csv-${Date.now()}@front.co`;
    const contrasena = 'secreta-e2e-12345';
    await comercioVerificado(request, correo, contrasena, 'Tienda E2E CSV');

    await page.goto('/entrar');
    await page.getByLabel('Correo').fill(correo);
    await page.getByLabel('Contraseña').fill(contrasena);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('link', { name: 'Tu negocio' }).click();
    await expect(page).toHaveURL(/\/tablero/);

    const descargaPromesa = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar CSV' }).click();
    const descarga = await descargaPromesa;

    expect(descarga.suggestedFilename()).toBe('movimientos.csv');

    const ruta = await descarga.path();
    const buffer = await (await import('node:fs/promises')).readFile(ruta!);
    // BOM UTF-8 (EF BB BF) y separador ';' — criterio literal de HU-019 del backend
    expect(buffer.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    const texto = buffer.toString('utf8');
    expect(texto).toContain('Fecha;Referencia;Monto bruto;Comisión;Neto;Estado');
  });
});
