/**
 *
 *
 * @returns {Object} Modulo con todas las operaciones cross aplicacion
 */
function utils() {


  /**
   * @name setConnString
   * @description De acuerdo al protocolo crea la cadena de conexion necesaria para conectar al servidor de base de datos
   * @param {Object} options Parametros necesarios para conectarse a la base de datos (host, database, user, password)
   * @returns {String} cadena de conexion valida para el motor de base de datos
   */
  function setConnString( options ) {
    var userPassword = '';

    if ( options.user && options.password ) {
      userPassword = `${options.user}:${options.password}@`;
    }

    return `${options.protocol}://${userPassword}${options.host}:${options.port}/${options.database}`;
  }

  return {
    setConnString: setConnString
  };
}

module.exports = utils();
