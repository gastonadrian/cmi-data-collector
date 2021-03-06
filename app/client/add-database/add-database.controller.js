( function addDatabaseControllerControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'addDatabase', addDatabaseController );

  addDatabaseController.$inject = [ '$mdDialog', '$scope', 'ipc' ];
  /**
   * @name addDatabaseController
   * @description Encapsula toda la funcionalidad necesaria para solicitar los datos de conexion a una base de datos
   * @param {any} $mdDialog - Servicio de dialogo de angular material
   * @param {any} $scope - scope
   * @param {any} ipc - servicio de intercomunicacion con el renderer
   * @returns {Object} - Funcionalidad publica del controller`
   */
  function addDatabaseController( $mdDialog, $scope, ipc ) {
    var self = this;
    angular.extend( self, {
      supportedEngines: [
        {
          title: 'MongoDB',
          value: 'mongo'
        },
        {
          title: 'MySQL',
          value: 'mysql'
        },
        {
          title: 'Microsoft SQL Server',
          value: 'mssql'
        }
      ],
      host: 'localhost',
      ok: ok,
      cancel: cancel,
      form: {
      }
    } );

    $scope.$watch( 'addDatabase.engine', function onEngineChange( newValue, oldValue ) {
      if ( !oldValue && !newValue ) {
        return;
      }
            // TODO, cargar presets
    } );

    /**
     * @name cancel
     * @description Cierra el dialogo
     * @returns {void}
     */
    function cancel() {
      $mdDialog.cancel();
    }

    /**
     * @name ok
     * @description En caso de que los datos sean validos, envia un mensaje al renderer para que intente conectarse a la base de datos
     * @returns {void}
     */
    function ok() {
      if ( !$scope.addDatabaseForm.$valid ) {
        return;
      }
      self.processingConnection = true;
      ipc.send( {
        msg: 'connect-database',
        data: self.form
      } );
    }

    $scope.$on( 'connect-database-ok', () => {
      self.processingConnection = false;
      $mdDialog.hide();
    } );

    $scope.$on( 'connect-database-error', ( event, msg ) => {
      self.processingConnection = false;
      if ( msg.data && msg.data.message ) {
        self.error = msg.message;
      } else {
        self.error = msg;
      }
    } );
  }
} )();
