import { nitEsValido } from './validacion-nit';

/**
 * Solo ayuda de UX temprana (HUF-007): el mismo algoritmo DIAN del backend
 * (docs/07 del repo hermano), pero la validación REAL siempre es la del
 * servidor. Vectores tomados de NITs ya usados y verificados en el backend.
 */
describe('nitEsValido', () => {
  it('acepta NITs con dígito de verificación correcto', () => {
    expect(nitEsValido('900650321-2')).toBe(true);
    expect(nitEsValido('811007832-5')).toBe(true);
    expect(nitEsValido('890399001-1')).toBe(true);
  });

  it('rechaza un dígito de verificación incorrecto', () => {
    expect(nitEsValido('900650321-9')).toBe(false);
  });

  it('rechaza formatos incompletos o sin guion', () => {
    expect(nitEsValido('900650321')).toBe(false);
    expect(nitEsValido('')).toBe(false);
    expect(nitEsValido('abc-2')).toBe(false);
  });
});
