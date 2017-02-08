var mssql = require( 'mssql' ),
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

    var getTablesQuery = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG='${options.database}'`,
      result = {
        tableNames: [],
        table: {
          data: [],
          columns: []
        }
      };

    _.merge( options, params );
    setupConnection();
    connection.connect();

    return new Promise( function setDataSourcePromise( resolve, reject ) {
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
          reject( error );
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
        limit: limit || 100,
        projection: projection || {},
        query: query || {}
      },
      result = {
        data: [],
        columns: []
      },
      queryString = `select TOP (${settings.limit}) * from ${tableName}`;

    _.merge( options, params );
    setupConnection();

    if ( !connection ) {
      setupConnection();
    }

    if ( connection.connected ) {
      return new Promise( getData );
    } else {
      connection.connect();
      return new Promise( function getTableDataPromise( resolve, reject ) {
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
        return new mssql.Request( connection ).query( queryString ).then( function onTableColumns( recordset ) {
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
        } );
      } catch ( exception ) {
        reject( exception );
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
    connection.on( 'erro', onConnectionError );
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

  // function onConnectionClosed() {
  //   console.log( `disconnected from ${options.database}` );
  // }

  // function onConnectionOpened() {
  //   console.log( `connected to ${options.database}` );
  // }

  return {
    setDataSource: setDataSource,
    getTableData: getTableData
  };

}

module.exports = mssqlAdapter;
