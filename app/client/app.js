( function appBootstrap() {
  'use strict';

  angular.module( 'data-collector', [ 'ui.router', 'ngMaterial', 'ngMdIcons', 'electangular', 'ngMessages', 'dataGrid', 'pagination' ] )
    .config( [
      '$mdThemingProvider',
      '$stateProvider',
      '$urlRouterProvider',
      function onConfig( $mdThemingProvider, $stateProvider, $urlRouterProvider ) {
        $mdThemingProvider.theme( 'altTheme' )
                .primaryPalette( 'indigo' );
        $mdThemingProvider.setDefaultTheme( 'altTheme' );

        $urlRouterProvider.otherwise( '/' );

        $stateProvider
            .state( 'home', {
              url: '/',
              controller: 'homeController as home',
              templateUrl: './home/home.template.html'
            } )
            .state( 'datasourceTable', {
              url: '/datasource/:datasourceId/:tableName',
              controller: 'datasourceTableController as datasourceTable',
              templateUrl: './datasource/datasourceTable.template.html'
            } );
      }
    ] )
    .run( [ '$rootScope', function onRun( $rootScope ) {

      /**
       * @name safeApply
       * @description Asegura que no se produzcan errores
       * @param {Function} fn - Funcion a ejecutar
       * @returns {void}
       */
      $rootScope.safeApply = function safeApply( fn ) {
        var phase = this.$$phase;
        if ( phase == '$apply' || phase == '$digest' ) {
          if ( fn && ( typeof ( fn ) === 'function' ) ) {
            fn();
          }
        } else {
          this.$apply( fn );
        }
      };

    } ] )
    .controller( 'mainController', mainController );

  mainController.$inject = [ 'electron', '$mdDialog', '$rootScope', 'ipc' ];
  /**
   * @name mainController
   * @description Controller principal se encarga de coordinar lo maximo posible con IPC, y de mostrar las fuentes de datos
   * @param {any} electron - Wrapper de electron
   * @param {any} $mdDialog - Servicio de dialogos de angular material
   * @param {any} $rootScope - Root scope
   * @param {any} ipc - Wrapper para intercomunicacion con el renderer
   * @return {void}
   */
  function mainController( electron, $mdDialog, $rootScope, ipc ) {
    var self = this;
    angular.extend( self, {
      showDatabaseDialog: showDatabaseDialog,
      showFileDialog: showFileDialog,
      openMenu: openMenu,
      databases: [],
      files: []
    } );

    init();

    /**
     * @name showDatabaseDialog
     * @description Levanta un dialogo, con el formulario para conectarse a una base de datos
     * @param {any} e - Evento
     * @returns {void}
     */
    function showDatabaseDialog( e ) {
      $mdDialog.show( {
        controller: 'addDatabase as addDatabase',
        templateUrl: './add-database/add-database.template.html',
        parent: angular.element( document.body ),
        targetEvent: e,
        clickOutsideToClose: true
      } );
    }

    /**
     * @name listDatasources
     * @description Muestra la lista de fuentes de datos
     * @param {Array} datasources - Listado de datasources
     * @returns {void}
     */
    function listDatasources( datasources ) {
      self.databases = datasources.databases;
      self.files = datasources.files;
    }

    $rootScope.$on( 'electron-msg', ( event, msg ) => {
      if ( msg.msg === 'get-datasources-ok' ) {
        listDatasources( msg.data );
      }
      if ( msg.msg === 'get-datasources-error' ) {
                // MENSAJE PIDIENDO QUE SE CONTACTE CON EL CENTRO DE ADMINISTRACION
      }
      $rootScope.safeApply();
    } );

    /**
     * @name openMenu
     * @description Abre el menu de las fuentes de datos
     * @param {any} $mdMenu - Servicio del menu de angular material
     * @param {any} ev - Evento
     * @returns {void}
     */
    function openMenu( $mdMenu, ev ) {
      $mdMenu.open( ev );
    }

    /**
     * @name showFileDialog
     *
     * @returns {void}
     */
    function showFileDialog( ) {
      // console.log( 'file', event );
    }

    /**
     * @name init
     * @description Inicializa el controller
     * @returns {void}
     */
    function init() {
      ipc.send( {
        msg: 'get-datasources',
        data: {}
      } );
    }

  }
} )();
