( function loginControllerControllerContainer() {

  'use strict';

  angular.module( 'data-collector' )
    .controller( 'loginController', loginController );

  loginController.$inject = [ '$mdDialog', '$scope', 'ipc' ];
  /**
   * @name loginController
   * @description Encapsula toda la funcionalidad necesaria para iniciar sesion
   * @param {any} $mdDialog - Servicio de dialogo de angular material
   * @param {any} $scope - scope
   * @param {any} ipc - servicio de intercomunicacion con el renderer
   * @returns {Object} - Funcionalidad publica del controller`
   */
  function loginController( $mdDialog, $scope, ipc ) {
    var self = this;
    angular.extend( self, {
      ok: ok,
      cancel: cancel,
      form: {
      }
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
      if ( !$scope.loginForm.$valid ) {
        return;
      }
      self.processingConnection = true;
      ipc.send( {
        msg: 'login',
        data: self.form
      } );
    }

    $scope.$on( 'login-ok', () => {
      self.processingConnection = false;
      $mdDialog.hide();
    } );

    $scope.$on( 'login-error', ( event, msg ) => {
      self.processingConnection = false;
      if ( msg.data && msg.data.message ) {
        self.error = msg.message;
      } else {
        self.error = msg;
      }
    } );
  }
} )();
