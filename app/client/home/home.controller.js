( function homeControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'homeController', homeController );

  homeController.$inject = [ '$scope', 'ipc', '$state', '$rootScope' ];
  /**
   * @name homeController
   * @description Controller de la primera vista
   * @param {any} $scope - $scope del controlador
   * @param {any} ipc - ipc
   * @param {any} $state - $state
   * @param {any} $rootScope - $scope global
   * @returns {Object} - Objeto con la interfaz publica del scope
   */
  function homeController( $scope, ipc, $state, $rootScope ) {
    var self = this;

    angular.extend( self, {
      withoutDatasources: false,
      showDatabase: false,
      showIndicatorsSync: false,
      indicators:[],
      saveDatabaseLabel: 'Elija un nombre con el que le gustaria identificar a la conexion',
      databaseName: '',
      saveDatabase: saveDatabase,
      handleDatasourceOk: handleDatasourceOk,
      sync:sync,
      query: {
        limit: 20,
        page: 1,
        order: ''
      },
      indicatorsQuery: {
        limit: 20,
        page: 1,
        order: ''
      },
      tables: [],
    } );


    /**
     * @name init
     * @description inicializa los datos del controlador
     */
    function init(){

      self.withoutDatasources = !(($rootScope.datasources.databases || $rootScope.datasources.files)  &&  ( $rootScope.datasources.databases.length + $rootScope.datasources.files.length));

      if($rootScope.indicators && $rootScope.indicators.length){
        self.showIndicatorsSync = true;
        self.indicators = $rootScope.indicators;
      }

      $scope.$on( 'get-datasources-ok', ( event, msg ) => {
        // msg es el listado de datasources, si la cuenta entre ambos es 0, 
        // entonces pedir al usuario que cargue
        self.withoutDatasources =  !(msg.databases.length + msg.files.length);
      } );

      $scope.$on( 'get-indicators-sync-ok', ( event, msg ) => {
        // handleDatabaseOk( msg );
        self.showIndicatorsSync = !!msg.length; 
        self.indicators = $rootScope.indicators;
      } );

      $scope.$on( 'connect-database-ok', ( event, msg ) => {
         handleDatasourceOk( msg );
                 $rootScope.safeApply();
      } );

      $scope.$on( 'connect-file-ok', ( event, msg ) => {
        handleDatasourceOk( msg );
                 $rootScope.safeApply();
      } );

      $scope.$on( 'save-database-ok', ( event, msg ) => {
        $state.go( 'datasourceTable', { datasourceId: msg, tableName: self.firstTable } );
      } );

      $scope.$on( 'save-database-error', () => {
        self.saveDatabaseLabel = 'Ha ocurrido un error, intente nuevamente!';
      } );

      $scope.$on( 'import-indicator-ok', ( event, msg ) => {
        self.indicators = $rootScope.indicators;
      } );

    }

    /**
     * @name saveDatabase
     * @description Pide guardar los datos de la base de datos al proceso renderer
     * @returns {void}
     */
    function saveDatabase() {
      if ( !self.conectionName ) {
        return;
      }

      ipc.send( {
        msg: 'save-datasource',
        data: {
          title: self.conectionName
        }
      } );

      self.showDatasource = false;
    }

    /**
     * @name handleDatasourceOk
     * @description Muestra los datos de la fuente de datos una vez conectada
     * @param {any} data - Datos de la base de datos conectada
     * @returns {void}
     */
    function handleDatasourceOk( data ) {
      if ( !data.tables || !data.tables.length ) {
        return;
      }
      self.showDatasource = true;
      self.datasourceName = data.name;
      self.tables = data.tables;
      self.firstTable = data.tables[ 0 ];
    }


    /**
     * @name sync
     * @description inicia las sincronizaciones para el indicador seleccionado
     * @param {Indicator} indicator - Indicador sobre el cual sincronizar los datos
     * @return {void}
     */
    function sync( indicator ) {
      var selectedDatasource;

      for(var j=0; j< $rootScope.indicators.length; j++){
        if($rootScope.indicators[j]._id === indicator._id){
            $rootScope.indicators[j].status = 'syncing';
            break;
        }
      }

      for(var i=0; i< $rootScope.datasources.databases.length; i++){
        if($rootScope.datasources.databases[i]._id === indicator.datasource._id){
            selectedDatasource = $rootScope.datasources.databases[i];
            break;
        }
        if($rootScope.datasources.files[i]._id === indicator.datasource._id){
            selectedDatasource = $rootScope.datasources.files[i];
            break;          
        }
      }

      ipc.send( {
        msg: 'import-indicator',
        data: {
          indicator: indicator,
          datasource: selectedDatasource
        }
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
