// node modules
var app = require( 'electron' ).remote,
  path = require( 'path' ),
  _ = require( 'lodash' ),
  ipcRenderer = require( 'electron' ).ipcRenderer,
  settings = require( 'electron-settings' ),

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
  },
  hasFrontendStarted = false,
  queuedMessagesToFrontend = [];

init();

/**
 * @name init
 * @description Inicializa el renderer
 * @returns {void}
 */
function init() {

  settings.defaults( {
    credentials: {}
  } );

  // wait for init-params
  ipcRenderer.on( 'init-params', ( event, arg ) => {
    var url = arg.replace( 'data-collector://', '' );
    sendMessageToMain( 'init-event', url );
  } );

  ipcRenderer.on( 'login', ( event, arg ) => {
    authenticate( event, arg, setListeners );
  } );

  // frontend integration, login as soon the app starts
  ipcRenderer.on( 'frontend-started', () => {
    hasFrontendStarted = true;

    if ( settings.hasSync( 'credentials.email' ) && settings.hasSync( 'credentials.password' ) ) {
      // authenticate
      authenticate( null, { email: settings.getSync( 'credentials.email' ), password: settings.getSync( 'credentials.password' ) }, setListeners );
    } else {
      // open login form
      ipcRenderer.send( 'renderer-msg', {
        msg: 'login-user',
        data: {}
      } );
    }
  } );
}

/**
 * @name authenticate
 * @description Autentica al usuario contra el servidor, y guarda las credenciales para futuros usos
 * @param {any} event - Evento
 * @param {any} args - Argumentos, parametros de conexion
 * @param {any} callback - Callback al que se desea llamar en caso de exito
 * @returns {void}
 */
function authenticate( event, args, callback ) {
  apiClient.login( args.email, args.password )
    .then( function onOk( response ) {

      //
      if ( response === 'Unauthorized' ) {
        ipcRenderer.send( 'renderer-msg', {
          msg: 'login-error',
          data: response
        } );

        ipcRenderer.send( 'renderer-msg', {
          msg: 'login-user',
          data: {}
        } );
        return;
      }

      if ( callback ) {
        callback();
      }

      ipcRenderer.send( 'renderer-msg', {
        msg: 'login-ok',
        data: {}
      } );


      // save settings
      if ( !settings.hasSync( 'credentials.email' ) ) {
        settings.set( 'credentials', { email: args.email, password: args.password }, { atomicSaving: false } );
      }
    } );
}


/**
 * @name setListeners
 * @description Inicializa los listeners
 * @returns {void}
 */
function setListeners() {
  var test = 'indicators/configure/58b1aab3d7693713051a8683';
  sendMessageToMain( 'init-event', test );


  // datasources

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

  ipcRenderer.on( 'get-table-data', ( event, arg ) => {
    getTableData( arg.datasource, arg.tableName );
  } );

  // import data

  ipcRenderer.on( 'import-preview', ( event, arg ) => {
    importData( arg.indicator, arg.datasource, null, null, false, 'import-preview' );
  } );

  ipcRenderer.on( 'import-data', ( event, arg ) => {
    importData( arg.indicator, arg.datasource, arg.month, arg.year, true, 'import-data' );
  } );

  // indicators

  ipcRenderer.on( 'get-indicator', ( event, arg ) => {
    apiClient.getIndicator( arg.id )
      .then( function onOk( response ) {
        sendMessageToMain( 'get-indicator-ok', response );
      } )
      .catch( function onError( error ) {
        sendMessageToMain( 'get-indicator-error', error );
      } );
  } );

  ipcRenderer.on( 'save-indicator', ( event, arg ) => {
    apiClient.saveIndicatorDataSource( arg )
      .then( function onOk( response ) {
        sendMessageToMain( 'save-indicator-ok', response );
      } )
      .catch( function onError( error ) {
        sendMessageToMain( 'save-indicator-error', error );
      } );
  } );


  // frontend integration

  if ( hasFrontendStarted ) {
    resumeMessages();
  } else {
    ipcRenderer.on( 'frontend-started', resumeMessages );
  }

}

/**
 * @name importData
 * @description Calcula el consolidado de datos de un mes para un indicador
 * @param {Indicator} indicator - El indicador sobre el cual calcular el consolidado
 * @param {Datasource} datasource - La fuente de datos de donde consultar datos
 * @param {number} month - Mes requerido
 * @param {number} year - Anio requerido
 * @param {Boolean} save - Si se desea guardar la importacion realizada.
 * @param {String} msgToken - Token de mensaje para notificar al que inicio la llamada
 * @returns {Promise} - Promesa que contiene el resultado de los datos guardados en el microservicio
 */
function importData( indicator, datasource, month, year, save, msgToken ) {
  var provider,
    connectionParams,
    returnPromise;

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
      provider = getDataSourceProvider( datasource.file.extension );
      connectionParams = datasource.file;
    }

    if ( year === null && month === null ) {
      returnPromise = provider.getLastMonthData( connectionParams, indicator )
    } else {
      returnPromise = provider.getMonthlyData( connectionParams, indicator, month, year );
    }

    if ( save ) {
      return returnPromise.then( apiClient.saveIndicatorData )
        .then( function onOk( response ) {
          sendMessageToMain( msgToken + '-ok', response );
        } )
        .catch( function onError( error ) {
          sendMessageToMain( msgToken + '-error', error );
        } );

    } else {
      return returnPromise
        .then( function onOk( response ) {
          sendMessageToMain( msgToken + '-ok', response );
        } )
        .catch( function onError( error ) {
          sendMessageToMain( msgToken + '-error', error );
        } );
    }

  } );
}


/**
 * @name getTableData
 * @description Obtiene una tabla con sus datos
 * @param {Object} datasource - Fuente de datos
 * @param {String} tableName - Nombre de tabla
 * @returns {Promise} Una promesa con los resultados de la conexion a la fuente de datos
 */
function getTableData( datasource, tableName ) {
  var provider,
    params;

  if ( datasource.type === 1 ) {
    provider = getDataSourceProvider( datasource.database.engine );
    params = datasource.database;
  } else {
    provider = getDataSourceProvider( datasource.file.extension );
    params = datasource.file;
  }
  provider.getTableData( params, tableName )
    .then( function onGetTable( data ) {
      sendMessageToMain( 'get-table-data-ok', data );
    } )
    .catch( function onError( error ) {
      sendMessageToMain( 'get-table-data-error', error );
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

  if ( !hasFrontendStarted ) {
    queuedMessagesToFrontend.push( { msg: msg, data: data } )
    return;
  }

  ipcRenderer.send( 'renderer-msg', {
    msg: msg,
    data: data
  } );
}

/**
 * @name resumeMessages
 * @description Comienza a enviar todos los mensajes que no pudieron enviarse porque el front no estaba iniciado
 * @returns {void}
 */
function resumeMessages() {
  var i = 0;
  hasFrontendStarted = true;
  sendMessageToMain( 'frontend-started-ok' );

  for ( i = 0; i < queuedMessagesToFrontend.length; i++ ) {
    sendMessageToMain( queuedMessagesToFrontend[ i ].msg, queuedMessagesToFrontend[ i ].data );
  }
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
