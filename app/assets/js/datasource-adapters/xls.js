var xlsx = require( 'xlsx' ),
  _ = require( 'lodash' );

/**
 * Excel Adapter de datasource en data-collector
 *
 * @returns {Object} Modulo de manejo de datos para planillas de excel
 */
function excelAdapter() {

  var options = {
      getFirstTableData: true,
      filePath: ''
    },
    workbook;

  /**
   * @name setDataSource
   * @description Realiza las operaciones necesarias para conectarse al datasource
   * @param {Object} params - Opciones:
   *  getFirstTableData {Boolean} Obtiene las columnas y todas las filas de la primer tabla en la lista de tablas.
   *  filePath: Url del path donde se encuentra el archivo a leer
   * @returns {Promise} Promesa que se resuelva al obtener los datos del datasource: Listado de tablas y primera tabla (definicion y datos si fueron solicitados)
   */
  function setDataSource( params ) {
    // TESTS:
        // VERIFICAR QUE SE PUEDE ABRIR UN XLS Y UN XLSX
        // VERIFICAR QUE SE DEVUELVE LA LISTA DE TABLAS
        // VERIFICAR QUE SE DEVUELVE UNA TABLA Y SU DEFINICION
    var result = {
      tableNames: []
    };

    // combinar todas los parametros con las opciones para sobreescribir valores por defecto
    _.merge( options, params );

    // retornamos una promesa, ideal en el caso de operaciones asincronicas
    return new Promise( function promise( resolve, error ) {

      try {

        // leemos el archivo
        workbook = xlsx.readFile( options.filePath );
        // en este caso les llamamos tablas a cada hoja del excel
        result.tableNames = workbook.SheetNames;

        // si en las opciones se pide obtener los datos y especificacion de la primera tabla ejecutamos esto
        if ( options.getFirstTableData && result.tableNames.length ) {

          // devolvemos la primer tabla
          return getTableData( options, result.tableNames[ 0 ] )
                      .then( function onTableDataResolved( firstTable ) {
                        result.table = firstTable;
                        resolve( result );
                        return result.table;
                      } );
        }

        // si no se pide la primer tabla, o no hay tablas, solo devolvemos el detalle de tablas/hojas
        resolve( result );
        return result;

      } catch ( exception ) {
        // en caso de error, la promesa escalara el error hacia sus subscriptores
        error( exception );
      }
    } );
  }

    // TESTS:
        // VERIFICAR QUE SE DEVUELVEN TODAS LAS COLUMNAS
        // VERIFICAR QUE SE DEVUELVE EL HEADER
        // PROBAR EL CASO DONDE EL EXCEL NO TIENE HOJAS
        // PROBAR EL CASO DONDE EL EXCEL NO TIENE LA HOJA ESPECIFICADA
    // TODO:
        // ENVIAR COLUMN DATA TYPE
  /**
   * @name getTableData
   * @description obtiene las columnas y el conjunto de filas para la tabla especificada.
   * @param {Object} params Opciones y configuracion para las tablas, filePath
   * @param {String} tableName Tabla/Hoja de la que se desean extraer los datos
   * @returns {Object}
   * {
   *  data {Array}: Filas con todos los valores,
   *  columns {Array}: Especificacion de columnas (titulo, data, y tipo de dato)
   * }
   */
  function getTableData( params, tableName ) {
    var worksheet,
      rowData = [],
      oldRow = 0,
      cellAddress,
      result = {
        data: [],
        columns: []
      },
      currentRow;

    // retornamos una promesa, ideal en el caso de operaciones asincronicas
    return new Promise( function onTableData( resolve, error ) {
      try {

        // si todavia no se leyo el archivo, leemos el mismo.
        if ( !workbook ) {
          _.merge( options, params );
          workbook = xlsx.readFile( options.filePath );
        }

        // obtenemos una referencia a la tabla solicitada
        worksheet = workbook.Sheets[ tableName ]

        // si el excel no tiene hojas, devolvemos una respuesta vacia
        if ( !worksheet ) {
          resolve( result );
          return result;
        }

        // recorremos todas las celdas de la hoja
        for ( cellAddress in worksheet ) {
          // las celdas que empiezan con '!' son las que contienen metada
          if ( cellAddress[ 0 ] === '!' ) {
            continue;
          }
          // obtenemos el numero de fila de la celda actual
          currentRow = xlsx.utils.decode_cell( cellAddress ).r;

          if ( oldRow !== currentRow ) {
            // hubo un cambio de fila
            oldRow = currentRow;

            if ( currentRow === 1 ) {
              // si la fila nueva es la 1 (o sea la segunda),
              // cargamos la primera fila (0), como la cabecera de la tabla
              result.columns = rowData.map( function mapRow( row ) {
                return {
                  title: row
                };
              } );

            } else {
              // agregamos la fila a la coleccion de filas
              result.data.push( rowData );
            }
            // borramos la fila temporal, para la nueva fila
            rowData = [];
          }

          // agregamos el valor de cada celda a la fila actual
          rowData.push( worksheet[ cellAddress ].v );
        }

        resolve( result );
      } catch ( exception ) {
        error( exception );
      }
    } );
  }

  return {
    setDataSource: setDataSource,
    getTableData: getTableData
  }

}


module.exports = excelAdapter;
