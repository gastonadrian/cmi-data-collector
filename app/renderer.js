// node modules
var app = require( 'electron' ).remote,
  path = require( 'path' ),
  _ = require( 'lodash' ),
  excel = require( './assets/js/datasource-adapters/xls' ),
  csv = require( './assets/js/datasource-adapters/csv' ),
  json = require( './assets/js/datasource-adapters/json' ),
  mongo = require( './assets/js/datasource-adapters/mongo' ),
  mysql = require( './assets/js/datasource-adapters/mysql' ),
  mssql = require( './assets/js/datasource-adapters/mssql' ),
  dialog = app.dialog,
  providers = {
    mongo: mongo,
    mysql: mysql,
    mssql: mssql,
    excel: excel,
    csv: csv,
    json: json
  },
  fileOptions = {
    getFirstTableData: true,
    filePath: ''
  },
  mongoOptions = {
    getFirstTableData: true,
    user: 'datacollector',
    password: 'datacollector',
    host: 'ds143559.mlab.com',
    port: 43559,
    database: 'kpis'
  },
  mySqlOptions = {
    getFirstTableData: true,
    user: 'root',
    password: '',
    host: 'localhost',
    port: 3306,
    database: 'prueba0602'
  },
  msSqlOptions = {
    getFirstTableData: true,
    user: 'datacollector',
    password: 'collectorData1',
    host: 'mssqltesis.database.windows.net',
    port: 1433,
    database: 'CatedralEstudio6'
  };

function getDataSourceProvider( provider ) {
  return providers[ provider ]();
}

function openDatasourceFile( fileNames ) {
  var datasourceProvider,
    extension;
  if ( fileNames && fileNames.length ) {

        // setup options
    _.merge( fileOptions, { filePath: fileNames[ 0 ] } );

        // get provider
    extension = path.extname( fileNames[ 0 ] ).split( '.' ).pop();
    datasourceProvider = getDataSourceProvider( extension );

        // call provider with options
    datasourceProvider.setDataSource( fileOptions )
            .then( function onDatasourceSetted( data ) {
              setupDataTable( data.firstTable );
            } );
  }
}

function setupDataTable( table ) {
  $( '.view' ).DataTable( {
    data: table.data,
    columns: table.columns
  } );

}

//TODO: saveForLater: NEEDS TO BE IMPLEMENTED HERE
function processDataSource( activeProvider ) {
  var provider = getDataSourceProvider( activeProvider );
  provider.setDataSource( msSqlOptions )
      .then( function onProviderResolve( data ) {
        setupDataTable( data.table );
      } );
}

function showFileDialog() {
  dialog.showOpenDialog( openDatasourceFile );
}

// connect and parse rest
// create dialog for open files
// create dialog for databases
// polish and push

// publish first version to prod
