/*eslint no-console: [2, { allow: ["warn", "error","info","log","debug"] }] */

'use strict'

const electron = require( 'electron' ),
  app = electron.app,
  Menu = require( 'electron' ).Menu,
  dialog = require( 'electron' ).dialog,
  ipc = require( 'electron' ).ipcMain,
  path = require( 'path' ),
  pjson = require( './package.json' ),
  _ = require( 'lodash' ),
  windowStateKeeper = require( 'electron-window-state' );

var config = {}

// Use system log facility, should work on Windows too
require( './lib/log' )( pjson.productName || 'CMIDataCollector' )

// Manage unhandled exceptions as early as possible
process.on( 'uncaughtException', ( e ) => {
  console.error( `Caught unhandled exception: ${e}` )
  dialog.showErrorBox( 'Caught unhandled exception', e.message || 'Unknown error message' )
  app.quit()
} )

// Load build target configuration file
try {
  config = require( './config.json' )
  _.merge( pjson.config, config )
} catch ( e ) {
  console.warn( 'No config file loaded, using defaults' )
}

let isDev = ( require( 'electron-is-dev' ) || pjson.config.debug ),
  // Prevent window being garbage collected
  mainWindow,
  // Other windows we may need
  infoWindow = null,
  // usado para cuando se abre la app con deep-linking
  urlData;

global.appSettings = pjson.config

if ( isDev ) {
  console.info( 'Running in development' )
} else {
  console.info( 'Running in production' )
}

console.debug( JSON.stringify( pjson.config ) )

// Adds debug features like hotkeys for triggering dev tools and reload
// (disabled in production, unless the menu item is displayed)
require( 'electron-debug' )( {
  // enabled: pjson.config.debug || isDev || false
  enabled: true
} )


app.setName( pjson.productName || 'SkelEktron' )

/**
 * @name initialize
 * @returns {void}
 */
function initialize() {
  var shouldQuit = makeSingleInstance()
  if ( shouldQuit ) {
    return app.quit()
  }

  /**
   * @name onClosed
   * @description
   * Dereference used windows
   * for multiple windows store them in an array
   * @returns { Void } void
   */
  function onClosed() {
    mainWindow = null
    infoWindow = null
  }

  /**
   * @description
   * Scaffolds the main window
   * @returns { Boolean } exit code
   */
  function createMainWindow() {
    // Load the previous window state with fallback to defaults
    let mainWindowState = windowStateKeeper( {
      defaultWidth: 1024,
      defaultHeight: 768
    } )

    const win = new electron.BrowserWindow( {
      'width': mainWindowState.width,
      'height': mainWindowState.height,
      'x': mainWindowState.x,
      'y': mainWindowState.y,
      'title': app.getName(),
      'icon': path.join( __dirname, '/app/assets/img/icon.png' ),
      // Hide your application until your page has loaded
      'show': false,
      'webPreferences': {
        // Disabling node integration allows to use libraries such as jQuery/React, etc
        'nodeIntegration': pjson.config.nodeIntegration || true,
        'preload': path.resolve( path.join( __dirname, '/backend/preload.js' ) )
      }
    } )

    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage( win )

    // Remove file:// if you need to load http URLs
    win.loadURL( `file://${__dirname}/${pjson.config.url}`, {} )

    win.on( 'closed', onClosed )

    // Then, when everything is loaded, show the window and focus it so it pops up for the user
    // Yon can also use: win.webContents.on('did-finish-load')
    win.on( 'ready-to-show', () => {
      win.show()
      win.focus()
    } )

    win.on( 'unresponsive', function onUnresponsive() {
      // In the real world you should display a box and do something
      console.warn( 'The windows is not responding' )
    } )

    win.webContents.on( 'did-fail-load', ( error, errorCode, errorDescription ) => {
      var errorMessage

      if ( errorCode === -105 ) {
        errorMessage = errorDescription || '[Connection Error] The host name could not be resolved, check your network connection'
        console.log( errorMessage )
      } else {
        errorMessage = errorDescription || 'Unknown error'
      }

      error.sender.loadURL( `file://${__dirname}/error.html` )
      win.webContents.on( 'did-finish-load', () => {
        win.webContents.send( 'app-error', errorMessage )
      } )
    } )

    win.webContents.on( 'crashed', () => {
      // In the real world you should display a box and do something
      console.error( 'The browser window has just crashed' )
    } )

    win.webContents.on( 'did-finish-load', () => {
      win.webContents.send( 'hello' )
    } )

    return win
  }

  app.on( 'window-all-closed', () => {
    if ( process.platform !== 'darwin' ) {
      app.quit()
    }
  } )

  app.on( 'activate', () => {
    if ( !mainWindow ) {
      mainWindow = createMainWindow()
    }
  } )

  app.setAsDefaultProtocolClient( 'data-collector' );

  app.on( 'ready', () => {
    Menu.setApplicationMenu( createMenu() )
    mainWindow = createMainWindow()

    // enviar todos los datos que no fueron posibles anteriormente xq no se habia creado mainWindow;
    handleUrl( {}, urlData );

    // Manage automatic updates
    try {
      require( './lib/auto-update/update' )( {
        url: ( pjson.config.update ) ? pjson.config.update.url || false : false,
        version: app.getVersion()
      } )
      ipc.on( 'update-downloaded', ( autoUpdater ) => {
        // Elegant solution: display unobtrusive notification messages
        mainWindow.webContents.send( 'update-downloaded' )
        ipc.on( 'update-and-restart', () => {
          autoUpdater.quitAndInstall()
        } )

        // Basic solution: display a message box to the user
        // var updateNow = dialog.showMessageBox(mainWindow, {
        //   type: 'question',
        //   buttons: ['Yes', 'No'],
        //   defaultId: 0,
        //   cancelId: 1,
        //   title: 'Update available',
        //   message: 'There is an update available, do you want to restart and install it now?'
        // })
        //
        // if (updateNow === 0) {
        //   autoUpdater.quitAndInstall()
        // }
      } )
    } catch ( e ) {
      console.error( e.message )
      dialog.showErrorBox( 'Update Error', e.message )
    }

  } )

  app.on( 'will-quit', () => {} )

  app.on( 'open-url', handleUrl );

  ipc.on( 'open-info-window', () => {
    if ( infoWindow ) {
      return
    }
    infoWindow = new electron.BrowserWindow( {
      width: 600,
      height: 600,
      resizable: false
    } )
    infoWindow.loadURL( `file://${__dirname}/info.html` )

    infoWindow.on( 'closed', () => {
      infoWindow = null
    } )
  } )

  // Listen for sync message from renderer process
  ipc.on( 'electron-msg', ( event, arg ) => {
    mainWindow.webContents.send( arg.msg, arg.data );
  } );

  ipc.on( 'renderer-msg', ( event, arg ) => {
    mainWindow.webContents.send( 'electron-msg', arg );
  } );
}


  /**
   * @name handleUrl
   * @description Envia al proceso principal la ruta elegida en deeplinking para abrir la aplicacion
   * @param {any} event - Evento
   * @param {any} params - Url a enviar al proceso renderer
   * @returns {void}
   */
function handleUrl( event, params ) {

  if ( !mainWindow || !mainWindow.webContents ) {
    urlData = params;
    return;
  }

  mainWindow.webContents.send( 'init-params', params );
}

/**
 * @name makeSingleInstance
 * @description
 * Make this app a single instance app.
 *
 * The main window will be restored and focused instead of a second window
 * opened when a person attempts to launch a second instance.
 *
 * Returns true if the current version of the app should quit instead of
 * launching.
 * @returns  { Object } singleton instance
 */
function makeSingleInstance() {
  return app.makeSingleInstance( ( commandLine, workingDirectory ) => {
    handleUrl( {}, workingDirectory[ 1 ] );
    if ( mainWindow ) {
      if ( mainWindow.isMinimized() ) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  } )
}

/**
 * @name createMenu
 *
 * @returns { Object } Menu
 */
function createMenu() {
  return Menu.buildFromTemplate( require( './lib/menu' ) )
}

// Manage Squirrel startup event (Windows)
require( './lib/auto-update/startup' )( initialize )
