/*eslint no-console: [2, { allow: ["log"] }] */

const electron = require( 'electron' ),
  { Menu, MenuItem } = electron.remote,
  menu = new Menu();

var linkMenuItem;

// Some default OS items
// Note: OS items cannot be programmatically disabled
menu.append( new MenuItem( { role: 'copy' } ) )
menu.append( new MenuItem( { role: 'paste' } ) )

// A separator
menu.append( new MenuItem( { type: 'separator' } ) )

// Some custom items
menu.append( new MenuItem( {
  label: 'MenuItem1',
  click( menuItem, browserWindow, event ) {
    console.log( 'Item 1 clicked' )
    console.log( menuItem )
    // no event.target available!
    console.log( event )
  }
} ) )

// Another separator
menu.append( new MenuItem( { type: 'separator' } ) )

// A menu item only for links
menu.append( new MenuItem( { label: 'MenuItem2', type: 'checkbox', checked: true, enabled: false } ) )
linkMenuItem = menu.items[ 5 ]

window.addEventListener( 'contextmenu', ( e ) => {
  e.preventDefault()
  // e.target is the underlying HTML element,
  // you can enable/disable non-OS items based on this before displaying
  // (i.e) example of menu item enabled for links only
  linkMenuItem.enabled = ( e.target.localName === 'a' )
  menu.popup( electron.remote.getCurrentWindow() )
}, false )
