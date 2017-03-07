var mssql = require( 'mssql' ),
  utils = require( './utils' ),
  _ = require( 'lodash' );

/**
 *
 *
 * @returns {Object} Modulo con toda la funcionalidad para conectarse a MSSQL
 */
function mssqlAdapter() {

  var options = {
      getFirstTableData: true,
      protocol: 'mssql',
      user: '',
      password: '',
      server: '',
      port: 0,
      database: '',
      options: {
        // Use this if you're on Windows Azure
        encrypt: true
      }
    },
    connection;

    // TESTS:
    //     PASAR OPCIONES QUE NO SON
  /**
   * @name setDataSource
   * @description Funcionalidad basica para conectarse y obtener la lista de tablas en mssql
   * @param {Object} params Opciones necesarias para conectarse a la base de datos
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve la lista de tablas y los datos (filas y columnas) de la primera tabla (si fue pedido en opciones)
   */
  function setDataSource( params ) {

    var getTablesQuery,
      result = {
        tableNames: [],
        table: {
          data: [],
          columns: []
        }
      };

    _.merge( options, params );
    getTablesQuery = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG='${options.database}'`;
    setupConnection();

    return new Promise( function setDataSourcePromise( resolve, reject ) {
      connection.connect()
        .catch( function onConnectionError( err ) {
          return reject( err );
        } );

      connection.once( 'connect', getTables.bind( this, resolve, reject ) );
    } );

    /**
     * @name getTables
     * @description Obtiene la lista de tablas y los datos de la primer tabla
     * @param {Function} resolve Funcion de la promesa, que al ejecutarse hace que esta se resuelva con el primer parametro
     * @param {Function} reject Funcion de la promesa, que al ejecutarse RECHAZA la promesa
     * @return {void}
     */
    function getTables( resolve, reject ) {
      new mssql.Request( connection ).query( getTablesQuery )
        //get the list of tables
        .then( function onGetTableNames( recordset ) {
          return recordset.map( function mapTables( table ) {
            return table.TABLE_NAME;
          } );
        } )
        // get the first table data
        .then( function onColumns( tableNames ) {
          result.tableNames = tableNames;
          if ( options.getFirstTableData && tableNames.length ) {
            return getTableData( options, tableNames[ 0 ] )
              .then( function onGetTableData( tableData ) {
                result.table = tableData;
                resolve( result );
                return result;
              } );
          }

          resolve( result );
          return result;
        } )
        .catch( function onException( error ) {
          return reject( error );
        } );
    }

  }

    // TESTS:
    //     VERIFICAR QUE SE DEVUELVEN TODAS LAS COLUMNAS
    //     VERIFICAR QUE SE DEVUELVE EL HEADER
  /**
   * @name getTableData
   * @description Obtiene las columnas y filas de la tabla pedida
   * @param {Object} params Lista de opciones para conectarse al servidor
   * @param {String} tableName Nombre de la tabla
   * @param {any} limit Cantidad de filas
   * @param {any} projection Proyeccion a usarse para filtrar los datos
   * @param {any} query Query a usar para filtrar los datos
   * @returns {Promise} Promesa que al resolverse contiene los datos de la tabla
   */
  function getTableData( params, tableName, limit, projection, query ) {
    var settings = {
        table: tableName,
        limit: limit || 0,
        projection: projection || {},
        query: query
      },
      result = {
        data: [],
        columns: []
      };

    if ( !query || !query.length ) {
      if ( settings.limit ) {
        settings.query = `select TOP ${settings.limit} * from ${tableName}`;
      } else {
        settings.query = `select * from ${tableName}`;
      }
    }


    _.merge( options, params );

    if ( !connection ) {
      setupConnection();
    }

    if ( connection.connected ) {
      return new Promise( getData );
    } else {
      return new Promise( function getTableDataPromise( resolve, reject ) {
        connection.connect()
          .catch( function onConnectionError( err ) {
            return reject( err );
          } );

        connection.once( 'connect', getData.bind( this, resolve, reject ) );

      } );
    }

    /**
     * @name getData
     * @description Obtiene los datos
     * @param {Function} resolve Funcion de la promesa, que al ejecutarse hace que esta se resuelva con el primer parametro
     * @param {Function} reject Funcion de la promesa, que al ejecutarse RECHAZA la promesa
     * @return {void}
     */
    function getData( resolve, reject ) {
      var column;
      try {
        return new mssql.Request( connection ).query( settings.query ).then( function onTableColumns( recordset ) {
          for ( column in recordset.columns ) {
            result.columns.push( {
              title: column,
              data: column,
              type: recordset.columns[ column ].type.declaration
            } );
          }
          result.data = recordset;
          resolve( result );
          return result;
        } )
        .catch( function onMSSQLRequestError( err ) {
          return reject( err );
        } );
      } catch ( exception ) {
        return reject( exception );
      }
    }
  }

  /**
   * @name setupConnection
   * @description Configura la coneccion a la base de datos
   * @returns {void}
   */
  function setupConnection() {
    if ( connection ) {
      return;
    }
    options.server = options.host;
    connection = new mssql.Connection( options );
    connection.on( 'error', onConnectionError );
    // connection.on( 'close', onConnectionClosed );
    // connection.on( 'connect', onConnectionOpened );
  }

  /**
   * @name onConnectionError
   * @description Handler para cuando la coneccion sufre un problema
   * @param {String} err Error
   * @return {void}
   */
  function onConnectionError( err ) {
    if ( !err ) {
      throw err;
    }
  }

  /**
   * @name getMonthlyData
   * @description Obtiene el consolidado de datos para un mes especifico sobre los datos de un indicador
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {Indicator} indicator Indicador sobre el cual se quieren importar los datos
   * @param {Date} from Fecha desde la cual se deberian importar los datos
   * @param {Date} to Fecha hasta la cual se deberian importar los datos  
   * @returns {Object} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getMonthlyData( params, indicator, from, to ) {

    return utils.getFromToDates( params, indicator, from, to )
      .then(function onDates( dates ) {
        from = dates.from;
        to = dates.to;    
        
        var tableQuery = utils.getImportQuery( params, indicator, from, to );

        return getTableData( params, indicator.datasource.table, 0, null, tableQuery, false )
          .then( utils.queryImportCallback.bind( this, indicator ) );
      } );
  }

  /**
   * @name getLastMonthData
   * @description Obtiene el consolidado de datos para el ultimo mes sobre los datos de un indicador
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {Indicator} indicator Indicador sobre el cual se quieren importar los datos
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getLastMonthData( params, indicator ) {
    return getMaxDate( params, indicator )
      .then( function onLastMonth( result ) {
        var from = new Date(result.year, result.month - 1, 1);
        return getMonthlyData( params, indicator, from, moment(from).endOf('month').toDate() );
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
   * @name getMaxDate
   * @description Obtiene la fecha del ultimo registro cargado en la tabla
   * @param {any} params - Parametros de conexion a la base de datos
   * @param {any} indicator - Indicador sobre el cual se quiere conectar
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve el mes y del primer registro
   */
  function getMinDate( params, indicator ){
    var query = 'select ' + indicator.datasource.dateColumn + ' as date from ' + params.database + '.`' + indicator.datasource.table + '` order by ' + indicator.datasource.dateColumn + ' asc limit 1';
    return executeMonthQuery( params, query );
  }

  function executeQuery( params, query ){
    _.merge( options, params );

    if ( !connection ) {
      setupConnection();
    }

    return new Promise(function onPromise(resolve, reject) {
      try {

        if ( connection.connected ) {

          return new mssql.Request( connection ).query( settings.query ).then( function onTableColumns( rows ) {
            resolve( rows );
            return rows;
          } )
          .catch( function onMSSQLRequestError( err ) {
            return reject( err );
          } );

        } else {

          connection.connect()
            .catch( function onConnectionError( err ) {
              return reject( err );
            } );

          connection.once( 'connect', function() {
            return new mssql.Request( connection ).query( settings.query ).then( function onTableColumns( rows ) {
              resolve( rows );
              return rows;
            } )
            .catch( function onMSSQLRequestError( err ) {
              return reject( err );
            } );

          } );

        }


      } catch ( exception ) {
        return reject( exception );
      }

    });
  }

  /**
   * @name executeMonthQuery
   * @description Dada una consulta de base de datos relacionada con fechas, devuelve el mes y la fecha
   * @param {any} params - Parametros de conexion a la base de datos
   * @param {any} query - Consulta de base de datos
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve el mes y anio
   */
  function executeMonthQuery( params, query ){
    return executeQuery( params, query )
      .then(function onQueryGet( rows ) {
          var result = { month: moment( rows[ 0 ].date ).month() + 1, year: moment( rows[ 0 ].date ).year() };
          return result;
      } );
  }

  return {
    setDataSource: setDataSource,
    getTableData: getTableData,
    getMonthlyData: getMonthlyData,
    getLastMonthData: getLastMonthData    
  };

}

module.exports = mssqlAdapter;
