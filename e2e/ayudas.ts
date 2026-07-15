import { APIRequestContext, expect } from '@playwright/test';

export const API = 'http://localhost:8080';
const ADMIN_EMAIL = process.env['PASARELA_ADMIN_EMAIL'] ?? 'admin@pasarela.local';
const ADMIN_CONTRASENA = process.env['PASARELA_ADMIN_CONTRASENA'] ?? 'admin-local-12345678';

/** NIT aleatorio con dígito de verificación DIAN válido (el backend valida). */
export function nitAleatorio(): string {
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

/**
 * El token de admin se cachea entre pruebas: cada login (incluso fallido)
 * cuenta contra el rate limiting por IP del backend (HU-022,
 * login.maximo=10/60s local), y todos los E2E comparten IP (localhost).
 * Sin este cacheo, la propia suite se autobloquea con 429.
 */
let tokenAdminCacheado: string | null = null;

async function tokenAdmin(request: APIRequestContext): Promise<string> {
  if (tokenAdminCacheado !== null) {
    return tokenAdminCacheado;
  }
  const respuesta = await request.post(`${API}/api/auth/login`, {
    data: { usuario: ADMIN_EMAIL, contrasena: ADMIN_CONTRASENA },
  });
  expect(respuesta.status(), await respuesta.text()).toBe(200);
  const { token } = (await respuesta.json()) as { token: string };
  tokenAdminCacheado = token;
  return token;
}

/** Registra y VERIFICA un comercio por API — listo para crear cobros. */
export async function comercioVerificado(
  request: APIRequestContext,
  correo: string,
  contrasena: string,
  razonSocial = 'Tienda E2E',
): Promise<void> {
  const registro = await request.post(`${API}/api/comercios`, {
    data: {
      razonSocial,
      nit: nitAleatorio(),
      cuentaLiquidacion: { tipo: 'NEQUI', numero: '3001112233', titular: razonSocial },
      credenciales: { email: correo, contrasena },
    },
  });
  expect(registro.status(), await registro.text()).toBe(201);
  const { id } = (await registro.json()) as { id: string };

  const token = await tokenAdmin(request);
  const verificacion = await request.post(`${API}/api/comercios/${id}/verificacion`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { decision: 'APROBAR' },
  });
  expect(verificacion.status(), await verificacion.text()).toBe(200);
}
