const electron = require( 'electron' ),
  ipc = electron.ipcRenderer,
  webFrame = electron.webFrame,
  maximumZoomLevel = 3,
  { Menu } = electron.remote;

var currentZoomLevel,
  zoomMenuItems;

/**
 * @description Gets all the menu items that contains the prefix on id = zoom-
 *
 * @returns { Array } MenuItems
 */
function getZoomUI() {
  const menu = Menu.getApplicationMenu()
  var menuItems = []
  menu.items.forEach( ( item ) => {
    if ( item.id === 'view' ) {
      item.submenu.items.forEach( ( item ) => {
        if ( item.id && item.id.match( /^zoom-.*/ ) ) {
          menuItems.push( item )
        }
      } )
    }
  } )
  return menuItems
}

/**
 * @description
 *  Enables the menu items on zoomMenuItem UI
 * @returns { Void } void
 */
function enableZoomUI() {
  zoomMenuItems.forEach( ( item ) => {
    item.enabled = true
  } )
}

/**
 * @description
 *  Disables the menu items on zoomMenuItem UI
 * @returns { Void } void
 */
function disableZoomUI() {
  zoomMenuItems.forEach( ( item ) => {
    item.enabled = false
  } )
}

window.addEventListener( 'blur', () => {
  disableZoomUI()
} )

window.addEventListener( 'focus', () => {
  enableZoomUI()
} )

window.addEventListener( 'load', () => {
  currentZoomLevel = webFrame.getZoomLevel()
  zoomMenuItems = getZoomUI()
  enableZoomUI()
} )
ipc.on( 'zoom-actual', ( ) => {
  currentZoomLevel = webFrame.setZoomLevel( 0 )
} )
ipc.on( 'zoom-in', ( ) => {
  if ( currentZoomLevel < maximumZoomLevel ) {
    currentZoomLevel = webFrame.setZoomLevel( currentZoomLevel + 1 )
  }
} )
ipc.on( 'zoom-out', ( ) => {
  if ( currentZoomLevel > 0 ) {
    currentZoomLevel = webFrame.setZoomLevel( currentZoomLevel - 1 )
  }
} )
