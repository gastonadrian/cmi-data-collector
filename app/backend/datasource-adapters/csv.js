'use strict';

var babyparse = require( 'babyparse' ),
  _ = require( 'lodash' ),
  utils = require( './utils' );

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


  function setDataSource( params ){
    return getTableData( params )
      .then(function(result) {
        result.tableNames = ['principal'];
        return result;
      } );
  }

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
      columns: [],
      data: []
    };
    _.merge( options, params );

    return new Promise( function promise( resolve, error ) {
      try {
        csvFile = babyparse.parseFiles( options.filePath );

        if ( !csvFile.data || !csvFile.data.length ) {
          return result;
        }

        result.columns = csvFile.data[ 0 ].map( function mapColumn( column ) {
          return {
            title: `'${column}'`
          };
        } );
        result.data = csvFile.data.splice( 1 );

        // revisar si la ultima fila tiene un solo elemento
        if ( result.data.length && result.data[ result.data.length - 1 ].length === 1 ) {
          // quitar la ultima fila si es invalida
          result.data.pop();
        }

        resolve( result );

      } catch ( exception ) {
        error( exception );
      }
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
   * @name getMaxDate
   * @description Obtiene la fecha del ultimo registro cargado en la tabla
   * @param {any} params - Parametros de conexion a la base de datos
   * @param {any} indicator - Indicador sobre el cual se quiere conectar
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve el mes y anio del ultimo registro
   */
  function getMaxDate( params, indicator ){
    var query = 'select ' + indicator.datasource.dateColumn + ' as date from ' + params.database + '.`' + indicator.datasource.table + '` order by ' + indicator.datasource.dateColumn + ' desc limit 1';
    return executeMonthQuery( params, query );
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
    getTableData: getTableData,
    setDataSource: setDataSource,
    getLastMonthData: getLastMonthData,
    getMonthlyData: getMonthlyData
  };

}


module.exports = csvAdapter;
