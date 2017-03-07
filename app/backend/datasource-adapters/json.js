var loadJsonFile = require( './../modules/loadjson' ),
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

  function setDataSource( params ){
    return getTableData( params )
      .then(function(result) {
        result.tableNames = ['principal'];
        return result;
      } );
  }

  /**
   * @name getTableData
   * @description Obtiene los datos del archivo JSON
   * @param {Object} params Configuracion, url del archivo
   * @returns {Promise} Promesa con las filas del archivo
   */
  function getTableData( params ) {
    var result = {
        columns: [],
        data: []
      },
      column;

    _.merge( options, params );

    return loadJsonFile( options.filePath )
      .then( function onLoadJsonFile( data ) {
        if ( data && data.length ) {
          for ( column in data[ 0 ] ) {
            result.columns.push( {
              title: column,
              data: column
            } );
          }
        }

        result.data = data;
        return result;
      } );
  }

  return {
    setDataSource: setDataSource,
    getTableData: getTableData
  };

}


module.exports = jsonAdapter;
