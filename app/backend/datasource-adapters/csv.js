var babyparse = require( './../modules/babyparse' ),
  _ = require( 'lodash' );

/**
 *
 *
 * @returns {Object} Modulo que ofrece toda la funcionalidad para conectarse a archivos csv
 */
function csvAdapter() {

  var options = {
      getFirstTableData: true,
      filePath: ''
    },
    csvFile;

    // TESTS:
    //     VERIFICAR QUE SE DEVUELVEN TODAS LAS COLUMNAS
    //     VERIFICAR QUE SE DEVUELVE EL HEADER
  /**
   * @name getTableData
   * @description Obtiene los datos del archivo CSV
   * @param {Object} params Configuracion, url del archivo
   * @returns {Promise} Promesa con las filas del archivo
   */
  function getTableData( params ) {
    var result = {
      table: {
        columns: [],
        data: []
      }
    };
    _.merge( options, params );

    return new Promise( function promise( resolve, error ) {
      try {
        csvFile = babyparse.parseFiles( options.filePath );

        if ( !csvFile.data || !csvFile.data.length ) {
          return result;
        }

        result.table.columns = csvFile.data[ 0 ].map( function mapColumn( column ) {
          return {
            title: column
          };
        } );
        result.table.data = csvFile.data.splice( 1 );

        // revisar si la ultima fila tiene un solo elemento
        if ( result.table.data.length && result.table.data[ result.table.data.length - 1 ].length === 1 ) {
          // quitar la ultima fila si es invalida
          result.table.data.pop();
        }

        resolve( result );

      } catch ( exception ) {
        error( exception );
      }
    } );
  }

  return {
    getTableData: getTableData,
    setDataSource: getTableData
  };

}


module.exports = csvAdapter;
