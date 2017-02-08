var loadJsonFile = require( 'load-json-file' ),
  _ = require( 'lodash' );

/**
 *
 *
 * @returns {Object} Modulo con toda la funcionalidad para conectarse con archivos JSON
 */
function jsonAdapter() {

  var options = {
    getFirstTableData: true,
    filePath: ''
  };

    // TESTS:
        // VERIFICAR QUE SE DEVUELVEN TODAS LAS COLUMNAS
        // VERIFICAR QUE SE DEVUELVE EL HEADER
    // TODO:
        // ENVIAR COLUMN DATA TYPE
  /**
   * @name getTableData
   * @description Obtiene los datos del archivo JSON
   * @param {Object} params Configuracion, url del archivo
   * @returns {Promise} Promesa con las filas del archivo
   */
  function getTableData( params ) {
    var result = {
        table: {
          columns: [],
          data: []
        }
      },
      column;

    _.merge( options, params );

    return loadJsonFile( options.filePath )
      .then( function onLoadJsonFile( data ) {
        if ( data && data.length ) {
          for ( column in data[ 0 ] ) {
            result.table.columns.push( {
              title: column,
              data: column
            } );
          }
        }

        result.table.data = data;
        return result;
      } );
  }

  return {
    setDataSource: getTableData,
    getTableData: getTableData
  };

}


module.exports = jsonAdapter;
