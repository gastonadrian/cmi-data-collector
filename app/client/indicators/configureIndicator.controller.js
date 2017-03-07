( function homeControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'configureIndicatorController', configureIndicatorController );

  configureIndicatorController.$inject = [ '$scope', 'ipc', '$state', '$rootScope', '$state' ];
  /**
   * @name configureIndicatorController
   * @description Controller de la configuracion de indicadores
   * @param {any} $scope - $scope
   * @param {any} ipc - ipc
   * @param {any} $stateParams - Servicio para obtener los parametros de la ruta
   * @param {any} $rootScope - $rootScope
   * @param {any} $state - Servicio para administrar los estados
   * @returns {Object} - Objeto con la interfaz publica del scope
   */
  function configureIndicatorController( $scope, ipc, $stateParams, $rootScope, $state ) {
    var self = this;

    angular.extend( self, {
      step: 0,
      showQuery: false,
      datasource: {},
      indicator: {},
      onDateSelected: onDateSelected,
      onValueSelected: onValueSelected,
      selectedDateColumn: [],
      selectedValueColumn: [],
      importPreview: {},
      save: save,
      query: {
        limit: 5,
        page: 1,
        order: ''
      },
      goToNext: goToNext,
      cancel: cancel
    } );

    /**
     * @name init
     * @description Inicializa el controller
     * @returns {void}
     */
    function init() {
      ipc.send( {
        msg: 'get-indicator',
        data: {
          id: $stateParams.params.indicatorId
        }
      } );

      $scope.$on( 'get-indicator-ok', ( event, msg ) => {
        loadIndicator( msg );
      } );

      $scope.$on( 'get-table-data-ok', ( event, msg ) => {
        loadTableData( msg );
      } );

      $scope.$on( 'table-selected', ( event, msg ) => {
        self.datasource = msg.datasource;
        self.table = msg.tableName;
        ipc.send( {
          msg: 'get-table-data',
          data: msg
        } );
      } );

      $scope.$on( 'import-preview-ok', ( event, msg ) => {
        var indicatorData = msg[0];
        self.importPreview.period = new Date( indicatorData.date ).getMonth() + 1 + ' de ' + new Date( indicatorData.date ).getFullYear();
        self.importPreview.value = indicatorData.value;
      } );

      $scope.$on( 'import-preview-error', ( event, msg ) => {
        self.error = msg;
      } );

      $scope.$on( 'save-indicator-error', ( event, msg ) => {
        self.error = msg;
      } );

      $scope.$on( 'save-indicator-ok', ( ) => {
        $state.go( 'home' );
      } );

    }

    /**
     * @name loadIndicator
     * @description Carga los datos del indicador a configurar
     * @param {any} data - Datos del indicador a configurar
     * @returns {void}
     */
    function loadIndicator( data ) {
      self.indicator = data;
      self.selectedDateColumn = [{ title: data.datasource.dateColumn }];
      self.selectedValueColumn = [{ title: data.datasource.valueColumn }];

      if(!self.indicator._id){
        return;
      }
      
       for(var i=0; i < $rootScope.datasources.length;i++){
         if($rootScope.datasources[i]._id === data.datasource._id ){
           askForTable({ datasource: $rootScope.datasources[i], tableName: data.datasource.table });
           break;
         }
       }
    }

    /**
     * @name loadTableData
     * @description Carga los datos de la tabla a usar como fuente de datos
     * @param {any} table - Datos de la tabla a usar
     * @returns {void}
     */
    function loadTableData( table ) {
      self.step = 1;
      self.data = table.data;
      self.columns = table.columns;
      self.indicator.datasource.table = self.table;

      if ( self.indicator.datasource.columnOperation === 5 ) {
        self.indicator.datasource.rowOperation = 'select ${prefijofiltrofecha} count(*) as result from ' + self.table + ' where  ${filtrofecha}';
        self.showQuery = true;
      }
    }


    function askForTable(msg){
        self.datasource = msg.datasource;
        self.table = msg.tableName;
        ipc.send( {
          msg: 'get-table-data',
          data: msg
        } );      
    }

    /**
     * @name goToNext
     * @description Mueve el wizard de configuracion hacia el siguiente paso
     * @returns {void}
     */
    function goToNext() {
      if ( self.indicator.datasource.columnOperation === 5 && self.step === 2 ) {
        self.step = 4;
      } else {
        self.step++;
      }

      if ( self.step === 4 ) {
        ipc.send( {
          msg: 'import-preview',
          data: {
            indicator: self.indicator,
            datasource: self.datasource
          }
        } );
      }
    }


    /**
     * @name cancel
     * @description Reinicia el wizard
     * @returns {void}
     */
    function cancel() {
      self.step = 0;
    }


    /**
     * @name onDateSelected
     * @description Metodo llamado cuando se selecciona la columna que servira como fecha
     * @param {any} selectedColumn - Columna elegida como fecha
     * @returns {void}
     */
    function onDateSelected( selectedColumn ) {
      self.indicator.datasource.dateColumn = selectedColumn.title;
      self.selectedDateColumn = [selectedColumn];
    }

    /**
     * @name onValueSelected
     * @description Metodo llamado cuando se selecciona la columna que servira como valor
     * @param {any} selectedColumn - Columna elegida como valor
     * @returns {void}
     */
    function onValueSelected( selectedColumn ) {
      self.indicator.datasource.valueColumn = selectedColumn.title;
      self.selectedValueColumn = [selectedColumn];
    }


    /**
     * @name save
     * @description Guarda la configuracion de importacion para el indicador
     * @returns {void}
     */
    function save() {
      self.indicator.datasource._id = self.datasource._id;

      ipc.send( {
        msg: 'save-indicator',
        data: self.indicator
      } );
    }

    if($rootScope.frontendStarted){
      init();
    }
    else{
      $scope.$on('frontend-started-ok', init );
    }

  }
} )();
