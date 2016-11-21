var resultado;

/**
 * @description Suma de dos numeros
 *
 * @param {Integer} a First Integer
 * @param {Integer} b Second Integer
 * @returns {Integer} Resultado
 */
function suma( a, b ) {
  resultado = a + b;
  return resultado;
}

/**
 * @description Resta de dos numeros
 *
 * @param {Integer} a First Integer
 * @param {Integer} b Second Integer
 * @returns {Integer} Resultado
 */
function resta( a, b ) {
  resultado = a - b;
}

/**
 * @description Multiplicacion de dos numeros
 *
 * @param {Integer} a First Integer
 * @param {Integer} b Second Integer
 * @returns {Integer} Resultado
 */
function multiplicacion( a, b ) {
  resultado = a * b;
}

module.exports = {
  suma: suma,
  resultado: resultado,
  resta: resta,
  multiplicacion: multiplicacion
};
