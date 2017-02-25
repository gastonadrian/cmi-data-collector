( function homeControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'homeController', homeController );

  homeController.$inject = [ '$rootScope', 'ipc', '$state' ];
  /**
   * @name homeController
   * @description Controller de la primera vista
   * @param {any} $rootScope - $rootScope
   * @param {any} ipc - ipc
   * @param {any} $state - $state
   * @returns {Object} - Objeto con la interfaz publica del scope
   */
  function homeController( $rootScope, ipc, $state ) {
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

    $rootScope.$on( 'electron-msg', ( event, msg ) => {
      if ( msg.msg === 'connect-database-ok' ) {
        handleDatabaseOk( msg.data );
      }
      if ( msg.msg === 'save-database-ok' ) {
        $state.go( 'datasourceTable', { datasourceId: msg.databaseId, tableName: self.firstTable } );
      }
      if ( msg.msg === 'save-database-error' ) {
        self.saveDatabaseLabel = 'Ha ocurrido un error, intente nuevamente!';
      }
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
