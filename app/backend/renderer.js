// node modules
var app = require( 'electron' ).remote,
  path = require( 'path' ),
  _ = require( 'lodash' ),
  ipcRenderer = require( 'electron' ).ipcRenderer,
  excel = require( './datasource-adapters/xls' ),
  csv = require( './datasource-adapters/csv' ),
  json = require( './datasource-adapters/json' ),
  mongo = require( './datasource-adapters/mongo' ),
  mysql = require( './datasource-adapters/mysql' ),
  mssql = require( './datasource-adapters/mssql' ),
  apiClient = require( './api-client' )(),
  dialog = app.dialog,
  providers = {
    mongo: mongo,
    mysql: mysql,
    mssql: mssql,
    excel: excel,
    csv: csv,
    json: json
  },
  latestOptions = {},
  fileOptions = {
    getFirstTableData: true,
    filePath: ''
  };

init();

/**
 * @name init
 * @description Inicializa el renderer
 * @returns {void}
 */
function init() {
  ipcRenderer.on( 'init-params', ( event, arg ) => {
    console.log(arg);
    sendMessageToMain( 'init-event', arg );
  } );

  ipcRenderer.on( 'connect-database', ( event, arg ) => {
    processDataSource( arg.engine, arg )
        .then( function onDatabaseConnect( data ) {
          latestOptions = {
            options: arg,
            tables: data.tableNames
          };
          sendMessageToMain( 'connect-database-ok', { databaseName: arg.database, tables: data.tableNames } );
        } )
        .catch( function onDatabaseConnectError( error ) {
          sendMessageToMain( 'connect-database-error', error );
        } );
  } );

  ipcRenderer.on( 'connect-file', showFileDialog );

  ipcRenderer.on( 'save-database', ( event, arg ) => {
    latestOptions.options.title = arg.title;
    apiClient.saveDataSource( 'database', latestOptions.options, latestOptions.tables )
      .then( function onDatasourceSaved( response ) {
        sendMessageToMain( 'save-database-ok', { datasourceId: response.id } );
        getDatasources();
      } )
      .catch( function onDatasourceError() {
        sendMessageToMain( 'save-database-error', {} );
      } );
  } );

  ipcRenderer.on( 'get-datasources', getDatasources );

  ipcRenderer.on( 'import-data', ( event, arg ) => {
    importData( arg.indicator, arg.datasource, arg.month, arg.year )
      .then( function onOk( response ) {
        sendMessageToMain( 'import-data-ok', response );
      } )
      .catch( function onError( error ) {
        sendMessageToMain( 'import-data-error', error );
      } );
  } );
}

/**
 * @name importData
 * @description Calcula el consolidado de datos de un mes para un indicador
 * @param {Indicator} indicator - El indicador sobre el cual calcular el consolidado
 * @param {Datasource} datasource - La fuente de datos de donde consultar datos
 * @param {number} month - Mes requerido
 * @param {number} year - Anio requerido
 * @returns {Promise} - Promesa que contiene el resultado de los datos guardados en el microservicio
 */
function importData( indicator, datasource, month, year ) {
  var provider,
    connectionParams;

  return new Promise( function onImport( resolve, reject ) {
    if ( !_.includes( datasource.tables, indicator.datasource.table ) ) {
      return reject( `La tabla (${indicator.datasour.table}) que configuro para este indicador no existe, por favor revise su configuracion` );
    }

    // database
    if ( datasource.type === 1 ) {

      if ( !datasource.database.engine ) {
        return reject( `El motor de base de datos es invalido, por favor reconfigure la fuente de datos "${datasource.title}"` );
      }
      provider = getDataSourceProvider( datasource.database.engine );
      connectionParams = datasource.database;
    } else {
      connectionParams = datasource.file;
    }

    return provider.getMonthlyData( connectionParams, indicator, month, year )
      .then( apiClient.saveIndicatorData );
  } );
}

/**
 * @name sendMessageToMain
 * @description Envia un mensaje al proceso principal de la aplicacion, quien a su vez lo reenvia al frontend
 * @param {any} msg - Token de Mensaje
 * @param {any} data - Datos a enviar
 * @returns {void}
 */
function sendMessageToMain( msg, data ) {
  ipcRenderer.send( 'renderer-msg', {
    msg: msg,
    data: data
  } );
}

/**
 * @name getDataSourceProvider
 * @description Retorna el proveedor de datos a utilizar para manipular la fuente de datos
 * @param {string} provider - Nombre del proveedor de datos a utilizar
 * @returns {Provider} - EL proveedor de fuentes de datos utilizado para conectar
 */
function getDataSourceProvider( provider ) {
  return providers[ provider ]();
}

/**
 * @name openDatasourceFile
 * @description Dado una coleccion de archivos, utiliza el proveedor necesario y se conecta/parsea y retorna los datos de esos archivos
 * @param {any} fileNames - Nombre de los archivos
 * @returns {Promise} Promesa con los datos guardados en el archivo
 */
function openDatasourceFile( fileNames ) {
  var extension;
  if ( fileNames && fileNames.length ) {

        // setup options
    _.merge( fileOptions, { filePath: fileNames[ 0 ] } );

        // get provider
    extension = path.extname( fileNames[ 0 ] ).split( '.' ).pop();
    return processDataSource( extension, fileOptions );
  }
}


/**
 * @name processDataSource
 * @description Se conecta a la fuente de datos
 * @param {any} activeProvider - Nombre del Proovedor de datos
 * @param {any} options - Opciones de conexion de datos
 * @returns {Promise} - Promesa que se resuelve al conectarse al proveedor de datos o al ocurrir un error
 */
function processDataSource( activeProvider, options ) {
  var provider = getDataSourceProvider( activeProvider );
  return provider.setDataSource( options );
}

/**
 * @name showFileDialog
 * @description Abre el dialogo de archivos nativo del sistema operativo
 * @returns {void}
 */
function showFileDialog() {
  dialog.showOpenDialog( openDatasourceFile )
    .then( function onDatabaseConnect( data ) {
      sendMessageToMain( 'connect-file-ok', { tables: data.tableNames } );
    } )
    .catch( function onDatabaseConnectError( error ) {
      sendMessageToMain( 'connect-file-error', error );
    } );
}

/**
 * @name getDatasources
 * @description Obtiene el listado de fuentes de datos y notifica al frontend
 * @returns {void}
 */
function getDatasources() {
  apiClient.getDatasources()
    .then( function onOk( response ) {
      sendMessageToMain( 'get-datasources-ok', response );
    } )
    .catch( function onError( error ) {
      sendMessageToMain( 'get-datasources-error', error );
    } );
}
