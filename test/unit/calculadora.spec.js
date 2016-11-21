/*eslint no-console: [2, { allow: ["warn", "error","info","log","debug"] }] */

'use strict'

const expect = require( 'chai' ).expect,
  calculadora = require( '../../app/assets/js/calculadora' );

describe( '(unit) calculadora', () => {

  // Before test suite
  before( ( done ) => {
    return done()
  } )

  // Before each of the tests
  beforeEach( ( done ) => {
    return done()
  } )

  describe( 'suma', () => {
    it( '1 + 1 = 2', ( done ) => {
      expect( calculadora.suma( 1, 1 ) ).to.be.equal( 2 )
      done()
    } )

  // add other tests...
  } )

  // add other features...

  // After each of the tests
  afterEach( ( done ) => {
    done()
  } )

  // At the end of all
  after( ( done ) => {
    done()
  } )
} )
