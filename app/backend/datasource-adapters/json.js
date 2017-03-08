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

  /**
   * @name getLastMonthData
   * @description Obtiene el consolidado de datos para el ultimo mes sobre los datos de un indicador
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {Indicator} indicator Indicador sobre el cual se quieren importar los datos
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getLastMonthData( params, indicator ){
    return getTableData( params, indicator )
      .then(function onData( response ) {
          var data = utils.getLastMonthDataJSON( params, indicator, response );
          return data;
      } );
  }
  
  /**
   * @name getMonthlyData
   * @description Obtiene el consolidado de datos para un mes especifico sobre los datos de un indicador
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {Indicator} indicator Indicador sobre el cual se quieren importar los datos
   * @param {Date} from Fecha desde la cual se deberian importar los datos
   * @param {Date} to Fecha hasta la cual se deberian importar los datos  
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getMonthlyData( params, indicator, from, to ) {
    return utils.getJSONMonthlyData( params, indicator, from, to, getTableData );
  }
  

  return {
    setDataSource: setDataSource,
    getTableData: getTableData,
    getLastMonthData: getLastMonthData,
    getMonthlyData: getMonthlyData
  };

}


module.exports = jsonAdapter;
