'use strict'

const Application = require( 'spectron' ).Application,
  chai = require( 'chai' ),
  chaiAsPromised = require( 'chai-as-promised' ),
  path = require( 'path' )

chai.should()
chai.use( chaiAsPromised )

describe( '(integration) cmi-data-collector', function describeSuite() {
  this.timeout( 30000 )

  let app

  const setupApp = function setupApp( app ) {
      chaiAsPromised.transferPromiseness = app.transferPromiseness
      return app.client.waitUntilWindowLoaded()
    },
    startApp = function startApp() {
      app = new Application( {
        path: path.join( __dirname, '..', '..', 'node_modules', '.bin', 'electron' ),
        args: [
          path.join( __dirname, '..', '..', 'app' )
        ],
        waitTimeout: 10000
      } )
      return app.start().then( setupApp )
    }

  before( function beforeEach() {
    return startApp()
  } )

  after( function afterEach() {
    if ( app && app.isRunning() ) {
      return app.stop()
    }
  } )

  it( 'opens a window displaying the main screen', function itWindowsOpen() {
    return app.client.getWindowCount().should.eventually.equal( 1 )
      .browserWindow.isMinimized().should.eventually.be.false
      .browserWindow.isDevToolsOpened().should.eventually.be.false
      .browserWindow.isVisible().should.eventually.be.true
      .browserWindow.isFocused().should.eventually.be.true
      .browserWindow.getBounds().should.eventually.have.property( 'width' ).and.be.above( 0 )
      .browserWindow.getBounds().should.eventually.have.property( 'height' ).and.be.above( 0 )
  } )
} )
