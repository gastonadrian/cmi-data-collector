( function homeControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'importPreviewController', importPreviewController );

  importPreviewController.$inject = [ '$rootScope', 'ipc', '$stateParams' ];

  /**
   * @name importPreviewController
   * @description Muestra una preview de los datos importados
   * @param {any} $rootScope - $rootScope
   * @param {any} ipc - ipc
   * @returns {Object} - Objeto con la interfaz publica del scope
   */
  function importPreviewController( $rootScope, ipc ) {
    var self = this;

    angular.extend( self, {
      paginationOptions: {
        itemsPerPage: 25
      },
      gridActions: {},
      gridOptions: {
        data: [],
        urlSync: true
      }
    } );

    /**
     * @returns {void}
     */
    function init() {
      getImportPreview();
    }

    $rootScope.$on( 'electron-msg', ( event, msg ) => {
      if ( msg.msg === 'connect-database-ok' ) {
        handleDatabaseOk( msg.data );
      }
    } );

    /**
     * @name getImportPreview
     * @description Pide los datos de importacion
     * @returns {void}
     */
    function getImportPreview() {
      if ( !self.conectionName ) {
        return;
      }

      ipc.send( {
        msg: 'get-import',
        data: {
          title: self.conectionName
        }
      } );
    }

    /**
     * @name handleDatabaseOk
     *
     * @param {any} data - Listado de tablas
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

    init();

  }
} )();
