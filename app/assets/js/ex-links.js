// Open all external links outside the app
// Credit: Electron API Demos app
const shell = require( 'electron' ).shell,
  links = document.querySelectorAll( 'a[href]' )

Array.prototype.forEach.call( links, function eachLink( link ) {
  const url = link.getAttribute( 'href' )
  if ( url.indexOf( 'http' ) === 0 ) {
    link.addEventListener( 'click', function onLinkClick( e ) {
      e.preventDefault()
      shell.openExternal( url )
    } )
  }
} )
