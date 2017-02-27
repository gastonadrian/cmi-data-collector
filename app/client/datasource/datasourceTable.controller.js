( function homeControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'datasourceTableController', datasourceTableController );

  datasourceTableController.$inject = [ '$scope', 'ipc', '$stateParams' ];
  /**
   * @name datasourceTableController
   * @description Controlador que muestra el contenido de una tabla correspondiente a una fuente de datos
   * @param {any} $scope - $scope
   * @param {any} ipc - ipc
   * @param {any} $stateParams - Parametros de la ruta
   * @returns {Object} - Objeto con la interfaz publica del scope
   */
  function datasourceTableController( $scope, ipc, $stateParams ) {
    var self = this;

    angular.extend( self, {
      datasourceId: $stateParams.datasourceId,
      tableName: $stateParams.tableName,
      paginationOptions: {
        itemsPerPage: 25
      },
      gridActions: {},
      gridOptions: {
        data: [],
        urlSync: true
      }
    } );
  }
} )();
