var mongoControl = require( 'mongo-control' ),
  _ = require( 'lodash' ),
  utils = require( './utils' );

/**
 *
 *
 * @returns {Object} Modulo con toda la funcionalidad necesaria para poder consumir bases de datos mongo
 */
function mongoAdapter() {

  var options = {
      getFirstTableData: true,
      protocol: 'mongodb',
      user: '',
      password: '',
      host: '',
      port: 0,
      database: ''
    },
    connString;

    // TESTS:
        // VERIFICAR QUE SE PUEDE CONECTAR A UNA BD
        // PROBAR UNA BD QUE NO TIENE COLECCIONES
        // PEDIR SOLO LAS TABLAS

  /**
   * @name setDataSource
   * @description conecta al servidor especificado, devuelve la lista de tablas (colecciones en este caso) y la primer coleccion en caso de que se haya proporcionado ese dato
   * @param {Object} params Parametros de conexion al servidor de base de datos
   * @returns {Promise} Promesa que se resuelve asincronicamente al finalizar las consultas a la base de datos. El objeto de la promesa devuelve:
   * {
   *  tableNames {Array<String>} Lista de las colecciones/tablas de la base de datos
   *  table: {Object} Objeto que contiene las columnas y filas de la primera coleccion/tabla (En caso que en los parametros se pida la primer tabla)
   * }
   */
  function setDataSource( params ) {
    var colIndex,
      result = {
        tableNames: [],
        table: {
          data: [],
          columns: []
        }
      };

      // combinamos los parametros en las opciones para sobreescribir valores por defecto
    _.merge( options, params );
    // obtenemos la cadena de conexion
    connString = utils.setConnString( options );

    // obtenemos la lista de colecciones
    return mongoControl.listCollections( { db: connString } )
      .then( function onListCollections( collections ) {
        // se agregan todas las colecciones, salvo system.indexes que contiene metadata sobre la base de datos
        for ( colIndex in collections ) {
          if ( collections[ colIndex ].name !== 'system.indexes' ) {
            result.tableNames.push( collections[ colIndex ].name );
          }
        }

        // devolvemos los resultados parciales al pipe de la promesa
        return result.tableNames;
      } )
      .then( function onListCollectionsResolved( tables ) {
        if ( options.getFirstTableData && tables.length ) {
          // si se solicito la primer tabla
          return getTableData( options, tables.tableNames[ 0 ] )
            .then( function onGetFirstTable( collectionData ) {
              result.table = collectionData;
              // devolvemos todo el objeto
              return result;
            } );
        }
      } );
  }

    // TESTS:
        // VERIFICAR QUE SE DEVUELVEN TODAS LAS COLUMNAS
        // VERIFICAR QUE SE DEVUELVE EL HEADER
        // PROBAR CON UNA COLECCION QUE NO EXISTE
  /**
   * @name getTableData
   * @description Obtiene los datos (columnas y filas) de la tabla solicitada
   * @param {Object} params Opciones para conectarse con la base de datos
   * @param {String} tableName Nombre de la coleccion/tabla solicitada
   * @param {Number} limit Cantidad maxima de filas pedidas
   * @param {Object} projection Si se va a utilizar una projeccion para traer los datos
   * @param {String} query Si se va a utilizar una query para obtener los datos
   * @returns {Object} Objeto con tabla(filas) y columnas para la tabla pedida.
   */
  function getTableData( params, tableName, limit, projection, query ) {
    var settings = {
        db: connString,
        collection: tableName,
        limit: limit || 100,
        projection: projection || {},
        query: query || {}
      },
      result = {
        data: [],
        columns: []
      },
      i;

    _.merge( options, params );
    connString = utils.setConnString( options );

    return mongoControl.find( settings ).then( function onData( collectionData ) {
      // si la coleccion existe
      if ( collectionData && collectionData.length ) {

        // por cada columna armar la definicion
        for ( i in collectionData[ 0 ] ) {

          // no agregamos la columnas que empiezan con _id (internas de mongo)
          if ( i === '_id' ) {
            continue;
          }

          result.columns.push( {
            title: i,
            data: i
          } );
        }
        result.data = collectionData;
      }
      return result;
    } );
  }

  return {
    setDataSource: setDataSource,
    getTableData: getTableData
  };
}

module.exports = mongoAdapter;



