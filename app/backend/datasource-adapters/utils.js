/**
 *
 *
 * @returns {Object} Modulo con todas las operaciones cross aplicacion
 */
function utils() {

  var moment = require( 'moment' ),
    _ = require( 'lodash' );

  /**
   * @name setConnString
   * @description De acuerdo al protocolo crea la cadena de conexion necesaria para conectar al servidor de base de datos
   * @param {Object} options Parametros necesarios para conectarse a la base de datos (host, database, user, password)
   * @returns {String} cadena de conexion valida para el motor de base de datos
   */
  function setConnString( options ) {
    var userPassword = '';

    if ( options.user && options.password ) {
      userPassword = `${options.user}:${options.password}@`;
    }

    return `${options.protocol}://${userPassword}${options.host}:${options.port}/${options.database}`;
  }

  /**
   * @name getImportQuery
   * @description Obtiene la consulta (query) a ser ejecutada para obtener el consolidado de datos
   * @param {Object} params - Parametros de conexion
   * @param {Indicator} indicator - Indicador sobre el cual pedir los datos
   * @param {number} month - Mes de importacion
   * @param {number} year - Anio de importacion
   * @returns {String} consulta a ejecutarse
   */
  function _getImportQuery( params, indicator, month, year ) {
    var tableQuery = '',
      tableName = indicator.datasource.table,
      valueColumn = indicator.datasource.valueColumn,
      dateColumn = indicator.datasource.dateColumn,
      columnOperation = indicator.datasource.columnOperation,
      query = indicator.datasource.rowOperation,
      date = new Date( year, month - 1, 1 ),
      from = moment( date ).format( 'YYYY-MM-DD' ),
      to = moment( date ).endOf( 'month' ).format( 'YYYY-MM-DD' ),
      dateQuery = `${dateColumn} BETWEEN STR_TO_DATE('${from}','%Y-%m-%d')  and STR_TO_DATE('${to}','%Y-%m-%d')`;

    // scape for tables with names like this => "table-name"
    tableName = '`' + tableName + '`';

    if ( params.engine === 'mssql' ) {
      dateQuery = `${dateColumn} BETWEEN '${from}' and '${to}'`;
    }

    if ( columnOperation === 5 ) {
      if ( query && query.length && _.includes( query, '${filtrofecha}' ) ) {
        return query.replace( '${filtrofecha}', dateQuery );
      } else {
        throw 'La consulta no tiene un filtro por mes, por favor agregue al final de WHERE "AND ${filtrofecha}"';
      }
    }

    if ( columnOperation === 4 ) {
      tableQuery = `select DISTINCT(${valueColumn}) from ${tableName} where ${dateQuery}`;
    }

    if ( columnOperation === 2 ) {
      tableQuery = `select SUM(${valueColumn}) as result from ${tableName} where ${dateQuery}`;
    }

    if ( columnOperation === 3 ) {
      tableQuery = `select COUNT(${valueColumn}) as result from ${tableName} where ${dateQuery}`;
    }

    if ( columnOperation === 1 ) {
      tableQuery = `select AVG(${valueColumn}) as result from ${tableName} where ${dateQuery}`;
    }

    return tableQuery;
  }


  /**
   * @name getImportQuery
   * @description Obtiene la consulta (query) a ser ejecutada para obtener el consolidado de datos
   * @param {Object} params - Parametros de conexion
   * @param {Indicator} indicator - Indicador sobre el cual pedir los datos
   * @param {Date} from Fecha desde la cual se deberian importar los datos
   * @param {Date} to Fecha hasta la cual se deberian importar los datos  
   * @returns {String} consulta a ejecutarse
   */
  function getImportQuery( params, indicator, from, to ) {
    var tableQuery = '',
      tableName = indicator.datasource.table,
      valueColumn = indicator.datasource.valueColumn,
      dateColumn = indicator.datasource.dateColumn,
      columnOperation = indicator.datasource.columnOperation,
      query = indicator.datasource.rowOperation,
      fromString = moment(from).format('YYYY-MM-DD'),
      toString = moment(to).format('YYYY-MM-DD'),
      dateQuery = `${dateColumn} BETWEEN STR_TO_DATE('${fromString}','%Y-%m-%d')  and STR_TO_DATE('${toString}','%Y-%m-%d')`,
      groupByPrefix = `MONTH(${dateColumn}) as mes, YEAR(${dateColumn}) as anio,`,
      groupBy = `group by mes, anio order by anio, mes`;

    // scape for tables with names like this => "table-name"
    tableName = '`' + tableName + '`';

    if ( params.engine === 'mssql' ) {
      dateQuery = `${dateColumn} BETWEEN '${fromString}' and '${toString}'`;
    }

    if ( columnOperation === 5 ) {
      if (!( query && query.length && _.includes( query, '${filtrofecha}' ) ) ) {
        throw 'La consulta no tiene un filtro por mes, por favor agregue al final de WHERE "AND ${filtrofecha}"';
      }

      if (!( query && query.length && _.includes( query, '${prefijofiltrofecha}' ) ) ) {
        throw 'La consulta no tiene un filtro por mes, por favor agregar al inicio de select "${prefijofiltrofecha}"';
      }
      
      return query.replace( '${filtrofecha}', dateQuery ).replace('${prefijofiltrofecha}', groupByPrefix );

    }

    if ( columnOperation === 4 ) {
      tableQuery = `select ${groupByPrefix} count(DISTINCT(${valueColumn})) as result from ${tableName} where ${dateQuery} ${groupBy}`;
    }

    if ( columnOperation === 2 ) {
      tableQuery = `select ${groupByPrefix} SUM(${valueColumn}) as result from ${tableName} where ${dateQuery}  ${groupBy}`;
    }

    if ( columnOperation === 3 ) {
      tableQuery = `select ${groupByPrefix} COUNT(${valueColumn}) as result from ${tableName} where ${dateQuery}  ${groupBy}`;
    }

    if ( columnOperation === 1 ) {
      tableQuery = `select ${groupByPrefix} AVG(${valueColumn}) as result from ${tableName} where ${dateQuery}  ${groupBy}`;
    }

    return tableQuery;
  }




  /**
   * @name queryImportCallback
   * @description Funcion a ejecutarse una vez los datos de importacion son devueltos por el proveedor de fuentes de datos
   * @param {Indicator} indicator - Indicador sobre el cual se desea importar datos
   * @param {Date} startOfMonth - Inicio del mes
   * @param {Array} rows - Datos devueltos por el proveedor de fuentes de datos
   * @returns {IndicatorData} Objeto que contiene los datos del consolidado.
   */
  function queryImportCallback( indicator, rows ) {
    var result = [];

    // if not maching results for the query return 0;
    if ( !rows.data || !rows.data.length ) {
      return result;
    }

    for(var i=0; i< rows.data.length; i++){
      result.push({
        indicatorId: indicator._id,
        customerId: indicator.customerId,
        value: rows.data[i].result,
        date: moment(new Date(rows.data[i].anio, rows.data[i].mes - 1, 1)).endOf('month').toDate()
      });
    }

    return result;
  }

  return {
    setConnString: setConnString,
    getImportQuery: getImportQuery,
    queryImportCallback: queryImportCallback
  };
}

module.exports = utils();
