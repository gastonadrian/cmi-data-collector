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
            settings.query += `limit ${settings.limit}`;
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
   * @param {number} month Mes sobre el cual se quieren calcular los datos
   * @param {number} year Anio sobre el cual se quieren calcular los datos
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getMonthlyData( params, indicator, month, year ) {

    var tableQuery = utils.getImportQuery( params, indicator, month, year );

    return getTableData( params, indicator.table, 0, tableQuery, null, false )
      .then( utils.queryImportCallback.bind( this, indicator, new Date( year, month - 1, 1 ) ) );
  }

  /**
   * @name getLastMonthData
   * @description Obtiene el consolidado de datos para el ultimo mes sobre los datos de un indicador
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {Indicator} indicator Indicador sobre el cual se quieren importar los datos
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getLastMonthData( params, indicator ) {

    var query = 'select ' + indicator.datasource.dateColumn + ' as date from ' + params.database + '.`' + indicator.datasource.table + '` order by ' + indicator.datasource.dateColumn + ' desc limit 1';
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
    .then( function onLastMonth( result ) {
      return getMonthlyData( params, indicator, result.month, result.year );
    } );

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
