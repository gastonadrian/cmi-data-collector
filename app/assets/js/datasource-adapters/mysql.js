var mysql = require( 'mysql' ),
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

    return new Promise( function mysqlSetDatasource( resolve, error ) {
      try {

        _.merge( options, params );
        setConnection();

        connection.query( `select * from information_schema.tables WHERE TABLE_SCHEMA = '${options.database}' and TABLE_TYPE = 'BASE TABLE'`, function onDescribeResponse( error, dbDefinition ) {

          if ( error ) {
            throw error;
          }

          result.tableNames = dbDefinition.map( function mapQueryResults( tableInfo ) {
            return tableInfo.TABLE_NAME;
          } );

          if ( options.getFirstTableData ) {
            return getTableData( options, result.tableNames[ 0 ] )
                          .then( function onGetTableData( tableData ) {
                            result.table = tableData;
                            resolve( result );
                          } );
          }
          resolve( result );
          return result;
        } );
      } catch ( exception ) {
        error( exception );
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
   * @param {Object} projection Projeccion, si es que se desea filtrar los resultados asi
   * @param {String} query Consulta a ejecutar en la bd
   * @returns {Object} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
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
      };

    return new Promise( function getTablePromise( resolve, error ) {
      try {
        _.merge( options, params );
        setConnection();

        connection.query( `describe ${options.database}.${tableName}`, function onColumnDefinition( error, tableDefinition ) {
          result.columns = tableDefinition.map( function mapColumns( columnDefinition ) {
            return {
              title: columnDefinition.Field,
              data: columnDefinition.Field,
              type: columnDefinition.Type
            };
          } );
        } );

              // get data
        connection.query( `select * from ${options.database}.${tableName} limit ${settings.limit}`, function onColumnDefinition( error, rows ) {
          result.data = rows;
          resolve( result );
        } );
      } catch ( exception ) {
        error( exception );
      }

    } ).then( function onGetTableDataResolved( response ) {
      if ( connection.state !== 'disconnected' ) {
        connection.end();
      }
      return response;
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
    getTableData: getTableData
  };
}


module.exports = mySqlAdapter;



