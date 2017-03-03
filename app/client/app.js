( function appBootstrap() {
  'use strict';

  angular.module( 'data-collector', [ 'ui.router', 'ngMaterial', 'ngMdIcons', 'electangular', 'ngMessages', 'md.data.table' ] )
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
            } )
            .state( 'configureIndicator', {
              url: '/indicators/configure/:indicatorId',
              controller: 'configureIndicatorController as configureIndicator',
              templateUrl: './indicators/configureIndicator.template.html'
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
    .filter( 'columnOperation', function columnOperationFilter() {
      return function onFiltering( input ) {
        var result = {
          '0': 'valor no valido',
          '1': 'promediar',
          '2': 'sumar',
          '3': 'contar',
          '4': 'contar valores distintos',
          '5': 'consulta(query) personalizada [avanzado]'
        };
        input = input || 0;

        return result[ input.toString() ];
      };
    } )
    .controller( 'mainController', mainController );

  mainController.$inject = [ 'electron', '$mdDialog', '$rootScope', 'ipc', '$location' ];
  /**
   * @name mainController
   * @description Controller principal se encarga de coordinar lo maximo posible con IPC, y de mostrar las fuentes de datos
   * @param {any} electron - Wrapper de electron
   * @param {any} $mdDialog - Servicio de dialogos de angular material
   * @param {any} $rootScope - Root scope
   * @param {any} ipc - Wrapper para intercomunicacion con el renderer
   * @param {any} $location - Wrapper para manejo de urls
   * @return {void}
   */
  function mainController( electron, $mdDialog, $rootScope, ipc, $location ) {
    var self = this;
    angular.extend( self, {
      showDatabaseDialog: showDatabaseDialog,
      showFileDialog: showFileDialog,
      loginOpened: false,
      selectTable: selectTable,
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
     * @name showLoginDialog
     * @description Levanta un dialogo, con el formulario para iniciar sesion
     * @param {any} e - Evento
     * @returns {void}
     */
    function showLoginDialog( e ) {
      if ( self.loginOpened ) {
        return;
      }
      self.loginOpened = true;
      $mdDialog.show( {
        controller: 'loginController as login',
        templateUrl: './login/login.template.html',
        parent: angular.element( document.body ),
        targetEvent: e,
        clickOutsideToClose: false,
        escapeToClose: false
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
        $rootScope.datasources = msg.data;
      }

      if ( msg.msg === 'init-event' ) {
        $location.path( msg.data );
        $rootScope.safeApply();
        return;
      }

      if ( msg.msg === 'get-indicators-sync-ok' ) {
        $rootScope.indicators = msg.data;
      }      

      if ( msg.msg === 'frontend-started-ok' ) {
        
        $rootScope.$broadcast('frontend-started-ok', {});

        ipc.send( {
          msg: 'get-datasources',
          data: {}
        } );

        ipc.send( {
          msg: 'get-indicators-sync',
          data: {}
        } );        
      }

      if ( msg.msg === 'login-user' ) {
        showLoginDialog();
      }

      if ( msg.msg === 'login-ok' ) {
        self.loginOpened = false;
      }

      if ( msg.msg === 'import-indicator-ok' ) {
        for( var i =0; i< $rootScope.indicators.length; i++ ) {
          if( $rootScope.indicators[i]._id === msg.data._id ) {
            $rootScope.indicators[i].status = 'updated';
            $rootScope.indicators[i].lastDateSynced = msg.data.date;
            break;
          }
        }
      }

      $rootScope.$broadcast( msg.msg, msg.data );
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
     * @name selectTable
     * @description Informa a toda la aplicacion que una tabla ha sido seleccionada
     * @param {any} datasource - Fuente de datos a la que la tabla corresponde
     * @param {any} tableName - Nombre de la tabla seleccionada
     * @returns {void}
     */
    function selectTable( datasource, tableName ) {
      $rootScope.$broadcast( 'table-selected', { datasource: datasource, tableName: tableName } );
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
      $rootScope.indicatorsOnSync= [];
      ipc.send( {
        msg: 'frontend-started'
      } );
    }

  }

} )();
