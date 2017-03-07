/**
 * @name apiClient
 * @description modulo encargado de consumir los microservicios expuestos
 * @returns {Object} Modulo de llamadas a microservicios
 */
module.exports = function apiClient() {
  var config = require( './../config.json' ),
    request = require( 'request' ).defaults( getServerInfo() ),
    _ = require( 'lodash' );

  /**
   * @name getServerInfo
   * @description Obtiene los datos por defecto de configuracion para comunicarse con los microservicios
   * @returns {Object} Configuracion para llamar los microservicios
   */
  function getServerInfo() {
        // TODO, get data from env file
    return {
      baseUrl: `http://${config.APIHOST}:${config.APIPORT}/${config.APIPREFIX}`,
      json: true,
      jar: true
    };
  }

  /**
   * @name saveDataSource
   * @description Invoca el microservicio que guarda las fuentes de datos
   * @param {Object} options - Contiene los datos especificos de la fuente de datos
   * @param {Array<String>} tables - Lista de tablas encontradas en la fuente de datos
   * @returns {Promise} - Promesa de llamada http
   */
  function saveDataSource( options, tables ) {

    var datasource = {
      type: options.filePath ? 'file' : 'database',
      title: options.title,
      tables: tables
    };

    if ( datasource.type === 'database' ) {
      datasource.type = 1;
      datasource.database = {
        engine: options.engine,
        host: options.host,
        port: options.port,
        database: options.database,
        user: options.user,
        password: options.password
      };
    } else {
      datasource.type = 2;
      datasource.file = {
        filePath: options.filePath,
        extension: options.extension
      };
    }

    return POST( '/datasources', datasource );
  }

  /**
   * @name getDatasources
   * @description Invoca al microservicio para obtener el listado de fuentes de datos
   * @returns {Promise} - Promesa de llamada http
   */
  function getDatasources() {
    return GET( 'datasources' )
            .then( function onGetDatasources( response ) {
              return {
                databases: _.filter( response, _.matchesProperty( 'type', 1 ) ),
                files: _.filter( response, _.matchesProperty( 'type', 2 ) )
              };
            } );
  }

  /**
   * @name saveIndicatorData
   * @description Invoca al microservicio que guarda los datos de importacion de indicador
   * @param {any} indicatorData - Consolidado mensual de datos de indicador
   * @returns {Promise} - Promesa de llamada http
   */
  function saveIndicatorData( indicatorData ) {
    return POST( 'indicatorsdata', { data: indicatorData } );
  }

  /**
   * @name getIndicator
   * @description Obtiene los datos de un indicador desde el api
   * @param {string} indicatorId - Id del indicador
   * @returns {Promise} - Promesa que contiene el resultado de los datos guardados en el microservicio
   */
  function getIndicator( indicatorId ) {
    return GET( 'indicators/' + indicatorId );
  }

  /**
   * @name getIndicatorsSync
   * @description Obtiene todos los indicadores que pueden sincronizarse con la fecha de la ultima sincronizacion
   * @returns {Promise} - Promesa que contiene el resultado de los datos guardados en el microservicio
   */
  function getIndicatorsSync(){
    return GET( 'indicatorsgetsync' );
  }

  /**
   * @name saveIndicator
   * @description Guarda los cambios realizados sobre un indicador
   * @param {any} indicator - Indicador a modificar
   * @returns {Promise} - Promesa que contiene el resultado de los datos guardados en el microservicio
   */
  function saveIndicatorDataSource( indicator ) {
    return POST( 'indicatorsdatasource', indicator );
  }

  /**
   * @name login
   * @description autentica el usuario ante el api
   * @param {any} email - Email
   * @param {any} password - Password
   * @returns {Promise} - Promesa que contiene el resultado de los datos guardados en el microservicio
   */
  function login( email, password ) {
    return new Promise( function onResponse( resolve, reject ) {
      request.post( {
        url: 'login',
        form: { email: email, password: password }
      }, function onPostResponse( err, xhr, response ) {
        if ( err ) {
          return reject( err );
        }
        return resolve( response );
      } );
    } );
  }


  // UTILS

  /**
   * @name POST
   * @description Contenedor que encapsula las configuraciones necesarias para realizar un POST a los microservicios
   * @param {any} url - Url relativa del microservicio
   * @param {any} body - Valores que se envian al mismo
   * @returns {Promise} - Promesa de llamada http
   */
  function POST( url, body ) {
    return new Promise( function onResponse( resolve, reject ) {
      request( {
        url: url,
        method: 'POST',
        body: body
      }, function onPostResponse( err, xhr, response ) {
        if ( err ) {
          return reject( err );
        }
        return resolve( response );
      } );
    } );
  }

  /**
   * @name GET
   * @description Contenedor que encapsula las configuraciones necesarias para realizar un GET a los microservicios
   * @param {any} url - Url relativa del microservicio
   * @param {any} data - Valores que se envian al mismo
   * @returns {Promise} - Promesa de llamada http
   */
  function GET( url, data ) {
    return new Promise( function onResponse( resolve, reject ) {
      request( {
        url: url,
        method: 'GET',
        data: data || {}
      }, function onGETResponse( err, xhr, response ) {
        if ( err ) {
          return reject( err );
        }
        return resolve( response );
      } );
    } );
  }

  return {
    saveDataSource: saveDataSource,
    getDatasources: getDatasources,
    saveIndicatorData: saveIndicatorData,
    getIndicator: getIndicator,
    saveIndicatorDataSource: saveIndicatorDataSource,
    login: login,
    getIndicatorsSync: getIndicatorsSync
  };
};
