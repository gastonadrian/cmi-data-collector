( function homeControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'homeController', homeController );

  homeController.$inject = [ '$scope', 'ipc', '$state' ];
  /**
   * @name homeController
   * @description Controller de la primera vista
   * @param {any} $scope - $scope
   * @param {any} ipc - ipc
   * @param {any} $state - $state
   * @returns {Object} - Objeto con la interfaz publica del scope
   */
  function homeController( $scope, ipc, $state ) {
    var self = this;

    angular.extend( self, {
      init: true,
      saveDatabaseLabel: 'Elija un nombre con el que le gustaria identificar a la conexion',
      databaseName: '',
      saveDatabase: saveDatabase,
      handleDatabaseOk: handleDatabaseOk,
      paginationOptions: {
        itemsPerPage: 25
      },
      gridActions: {},
      gridOptions: {
        data: [],
        urlSync: true
      }
    } );

    $scope.$on( 'connect-database-ok', ( event, msg ) => {
      handleDatabaseOk( msg );
    } );

    $scope.$on( 'save-database-ok', ( event, msg ) => {
      $state.go( 'datasourceTable', { datasourceId: msg, tableName: self.firstTable } );
    } );

    $scope.$on( 'save-database-error', () => {
      self.saveDatabaseLabel = 'Ha ocurrido un error, intente nuevamente!';
    } );

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
        msg: 'save-database',
        data: {
          title: self.conectionName
        }
      } );
    }

    /**
     * @name handleDatabaseOk
     * @description Muestra los datos de la base de datos una vez conectada
     * @param {any} data - Datos de la base de datos conectada
     * @returns {void}
     */
    function handleDatabaseOk( data ) {
      if ( !data.tables || !data.tables.length ) {
        return;
      }
      self.init = false;
      self.databaseName = data.databaseName;
      self.gridOptions.data = data.tables;
      self.firstTable = data.tables[ 0 ];
      self.gridActions.refresh();
    }
  }
} )();
