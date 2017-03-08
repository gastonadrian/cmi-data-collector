/**
 *
 *
 * @returns {Object} Modulo con todas las operaciones cross aplicacion
 */
function utils() {
  'use strict';

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
      
      return query.replace( '${filtrofecha}', `${dateQuery} ${groupBy}` ).replace('${prefijofiltrofecha}', groupByPrefix );

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
   * @name getFromToDates
   * @description Valida y devuelve el rango de datos sobre el cual importar los datos
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {Indicator} indicator Indicador sobre el cual se quieren importar los datos
   * @param {Date} from Fecha desde la cual se deberian importar los datos
   * @param {Date} to Fecha hasta la cual se deberian importar los datos  
   * @returns {Promise} Promesa que devuelve las fechas sobre las cuales importar datos
   */
  function getFromToDates( params, indicator, from, to, getMinDate ) {
    return new Promise( function getDatesPromise(resolve, reject ) {
      var result = {
        from:from,
        to:to
      };

      // defaults "TO" to today
      if(!to || !moment.isDate(to)){
        result.to = new Date();
      }

      if(!from || !moment.isDate(from)){
        return getMinDate( params, indicator )
          .then(function (date){
              result.from = new Date(date.year, date.month - 1, 1);
              resolve(result);
              return result;
          });
      }

      resolve(result);
      return result;
    } );
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

  function getJSONFromArray(data, columns, dateColumn) {
    var json = [];
    for(var i=0; i < data.length; i++){
      var newObject = {};
      for(var j=0; j < columns.length; j++) {

        if( dateColumn && columns[j].title == dateColumn ){
          newObject[columns[j].title] = moment(data[i][j],"DD/MM/YYYY").toDate();
        } else {
          newObject[`${columns[j].title}`] = data[i][j];
        }
      }
      json.push(newObject);
    }

    return _.sortBy(json, [function(obj) { return obj[dateColumn]; }]);
  }

  function getLastMonthDataJSON( params, indicator, table ){
      var json,
        minDate,
        maxDate,
        range,
        result = [];

      if(!table.data.length){
        return result;
      }
        
      json = getJSONFromArray( table.data, table.columns, indicator.datasource.dateColumn );
      
      // ordered by date
      maxDate = moment(json[json.length-1][indicator.datasource.dateColumn]).endOf('month').toDate();
      minDate = moment(maxDate).startOf('month').toDate();

      result.push(getJSONMonthData( json, indicator, minDate, maxDate ));

      return result;
  }

  function getJSONMonthData( table, indicator, from, to ){
    var result = {
        customerId: indicator.customerId,
        indicatorId: indicator._id,
        value: null,
        date: to
    },
    data = [];

    for( var i=0; i< table.length; i++ ) {
        var rowDate = table[i][indicator.datasource.dateColumn];
        if( moment(rowDate).isBetween(from, to)  ){
          data.push(table[i]);
        }
    }    

    if ( indicator.datasource.columnOperation === 5 ) {
        throw 'La consultas personalizadas no estan disponibles para fuentes de datos de tipo archivo';
    }

    if(!data.length){
      result.value = null;
      return result;
    }

    if ( indicator.datasource.columnOperation === 4 ) {
      result.value = _.uniqBy(data, function distinct(obj){
        return obj[indicator.datasource.valueColumn];
      }).length;
    } 

    if ( indicator.datasource.columnOperation === 3 ) {
      result.value = data.length;
    }

    if ( indicator.datasource.columnOperation === 2 ) {
      result.value = _.sumBy(data, indicator.datasource.valueColumn);
    }
    
    if ( indicator.datasource.columnOperation === 1 ) {
      result.value = _.sumBy(data, indicator.datasource.valueColumn) / data.length;
    }

    return result;
  }

  function getJSONFromToDates( table, indicator, from, to ) {
      var result = {
        from: from,
        to: to
      };
      // defaults "TO" to today
      if(!to || !moment.isDate(to)){
        result.to = new Date();
      }

      if(!from || !moment.isDate(from)){
          result.from = table[0][indicator.datasource.dateColumn];
      }
      return result;
  }

  /**
   * @name getMonthlyData
   * @description Obtiene el consolidado de datos para un mes especifico sobre los datos de un indicador
   * @param {Object} params Lista de opciones necesarias para conectarse a la bd
   * @param {Indicator} indicator Indicador sobre el cual se quieren importar los datos
   * @param {Date} from Fecha desde la cual se deberian importar los datos
   * @param {Date} to Fecha hasta la cual se deberian importar los datos  
   * @returns {Promise} Promesa asincronica, que al resolverse devuelve las columnas y filas de la tabla proporcionada
   */
  function getJSONMonthlyData( params, indicator, from, to, getTableData ) {
    return getTableData( params )
      .then(function onData(table){
          var dates,
            monthStart,
            monthEnd,
            result = [];

          table = getJSONFromArray( table.data, table.columns, indicator.datasource.dateColumn);
          dates = getJSONFromToDates( table, indicator, from, to );
          from = dates.from;
          to = dates.to;
          monthStart = from;
          monthEnd = moment(from).endOf('month').toDate();
          
          while( moment(monthEnd).isBefore(to) ){
              result.push(getJSONMonthData(table, indicator, monthStart, monthEnd));
              monthStart = moment(monthStart).add(1, 'month').startOf('month').toDate();
              monthEnd = moment(monthStart).endOf('month').toDate();
          }

          return result;
      } );
  }  

  return {
    setConnString: setConnString,
    getImportQuery: getImportQuery,
    queryImportCallback: queryImportCallback,
    getFromToDates: getFromToDates,
    getLastMonthDataJSON: getLastMonthDataJSON,
    getJSONFromArray: getJSONFromArray,
    getJSONMonthlyData: getJSONMonthlyData
  };
}

module.exports = utils();
