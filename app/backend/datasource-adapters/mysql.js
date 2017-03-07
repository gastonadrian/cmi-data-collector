var mysql = require( 'mysql' ),
  utils = require( './utils' ),
  moment = require( 'moment' ),
  _ = require( 'lodash' );

/**
 *
 *
 * @returns {Object} Modulo que contiene toda la funcionalidad para conectarse con mysql
 */
function mySqlAdapter() {

  var options = {
      getFirstTableData: true,
      user: '',
      password: '',
      host: '',
      port: 0,
      database: ''
    },
    connection;

    // TESTS:
        // PASAR OPCIONES QUE NO SON
        // QUE NO TENGA TABLAS
        // PEDIR SOLO LAS TABLAS
  /**
   * @name setDataSource
   * @description Se conecta con la fuente de datos y obtiene la lista de tablas y los datos de la primer tabla (si es solicitado)
   * @param {Object} params Opciones necesarias para conectarse a la base de datos, y tambien se especifica si se quieren los datos de la primer tabla
   * @returns {Promise} Promesa que se resuelve asincronicamente, devuelve la lista de tablas y datos de la primer tabla.
   */
  function setDataSource( params ) {
    var result = {
      tableNames: [],
      table: {
        data: [],
        columns: []
      }
    };

    return new Promise( function mysqlSetDatasource( resolve, reject ) {
      try {

        _.merge( options, params );
        setConnection();

        connection.query( `select * from information_schema.tables WHERE TABLE_SCHEMA = '${options.database}' and TABLE_TYPE = 'BASE TABLE'`, function onDescribeResponse( error, dbDefinition ) {

          if ( error ) {
            return reject( { message: error.message } );
          }

          result.tableNames = dbDefinition.map( function mapQueryResults( tableInfo ) {
            return tableInfo.TABLE_NAME;
          } );

          if ( options.getFirstTableData ) {
            return getTableData( options, result.tableNames[ 0 ], 100, null, null, false )
                          .then( function onGetTableData( tableData ) {
                            result.table = tableData;
                            resolve( result );
                          } );
          }
          resolve( result );
          return result;
        } );
      } catch ( exception ) {
        return reject( exception );
      }
    } ).then( function onTableResolved( response ) {

      connection.end();
      return response;

    } );
  }

    // TESTS:
        // VERIFICAR QUE SE DEVUELVEN TODAS LAS COLUMNAS
        // VERIFICAR QUE SE DEVUELVE EL HEADER
        // VERIFICAR CUANDO NO EXISTE LA TABLA
  /**
   * @name getTableData
   * @description Devuelve las columnas y filas de la tabla
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {String} tableName Nombre de la tabla
   * @param {Number} limit Cantidad de resultaods pedidos
   * @param {String} query Consulta a ejecutar en la bd
   * @param {Object} projection Projeccion, si es que se desea filtrar los resultados asi
   * @param {Boolean} withColumns Si los datos devueltos deben incluir la especificacion de columnas.
   * @returns {Object} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getTableData( params, tableName, limit, query, projection, withColumns ) {
    var settings = {
        table: tableName,
        projection: projection || {},
        query: query
      },
      result = {
        data: [],
        columns: []
      };

    if ( withColumns !== false ) {
      withColumns = true;
    }

    return new Promise( function getTablePromise( resolve, reject ) {
      try {
        _.merge( options, params );
        setConnection();

        if ( !query || !query.length ) {
          settings.query = 'select * from ' + options.database + '.`' + tableName + '`';
          if ( limit ) {
            settings.query += `limit ${limit}`;
          }
        }

        if ( withColumns ) {
          connection.query( 'describe ' + options.database + '.`' + tableName + '`', function onColumnDefinition( error, tableDefinition ) {
            if ( error ) {
              return reject( { message: error.message } );
            }
            result.columns = tableDefinition.map( function mapColumns( columnDefinition ) {
              return {
                title: columnDefinition.Field,
                data: columnDefinition.Field,
                type: columnDefinition.Type
              };
            } );
          } );
        }

            // get data
        connection.query( settings.query, function onColumnDefinition( error, rows ) {
          if ( error ) {
            return reject( { message: error.message } );
          }

          result.data = rows;
          resolve( result );
        } );
      } catch ( exception ) {
        return reject( exception );
      }

    } ).then( function onGetTableDataResolved( response ) {
      if ( connection.state !== 'disconnected' ) {
        connection.end();
      }
      return response;
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

    return utils.getFromToDates( params, indicator, from, to )
      .then(function onDates( dates ) {
          from = dates.from;
          to = dates.to;

          var tableQuery = utils.getImportQuery( params, indicator, from, to );

          return getTableData( params, indicator.table, 0, tableQuery, null, false )
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

  /**
   * @name executeMonthQuery
   * @description Dada una consulta de base de datos relacionada con fechas, devuelve el mes y la fecha
   * @param {any} params - Parametros de conexion a la base de datos
   * @param {any} query - Consulta de base de datos
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve el mes y anio
   */
  function executeMonthQuery( params, query ){
    _.merge( options, params );
    setConnection();

    return new Promise( function onDate( resolve, reject ) {

      connection.query( query, function onColumnDefinition( error, rows ) {
        if ( error ) {
          return reject( { message: error.message } );
        }

        resolve( { month: moment( rows[ 0 ].date ).month() + 1, year: moment( rows[ 0 ].date ).year() } );
      } );
    } )    
  }


  /**
   * @name setConnection
   * @description Prepara la conexion a la base de datos
   * @returns {Object} Objeto de conexion mysql
   */
  function setConnection() {
    if ( connection ) {
      return;
    }

    connection = mysql.createConnection( {
      host: options.host,
      user: options.user,
      port: options.port,
      password: options.password,
      database: options.database
    } );
    connection.connect( function onConnectError( err ) {
      if ( !err ) {
        throw err;
      }
    } );
  }

  return {
    setDataSource: setDataSource,
    getTableData: getTableData,
    getMonthlyData: getMonthlyData,
    getLastMonthData: getLastMonthData
  };
}


module.exports = mySqlAdapter;
