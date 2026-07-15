/**
 * Ayuda de UX temprana para el NIT (HUF-007): el mismo algoritmo DIAN que
 * usa el backend (peso 3,7,13,17,19,23,29,37,41... de derecha a izquierda,
 * módulo 11) — pero la validación que de verdad decide es la del servidor
 * (400 si el dígito no corresponde). Esto solo evita un viaje redondo obvio.
 */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

function digitoDeVerificacion(base: string): number {
  const suma = base
    .split('')
    .reverse()
    .reduce((acumulado, digito, indice) => acumulado + Number(digito) * (PESOS[indice] ?? 0), 0);
  const resto = suma % 11;
  return resto < 2 ? resto : 11 - resto;
}

export function nitEsValido(nitCompleto: string): boolean {
  const coincidencia = /^(\d{5,15})-(\d)$/.exec(nitCompleto.trim());
  if (coincidencia === null) {
    return false;
  }
  const [, base, dv] = coincidencia;
  return digitoDeVerificacion(base) === Number(dv);
}
