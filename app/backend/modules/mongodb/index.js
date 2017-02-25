// Core module
function connect(){
  var core = require('mongodb-core'),
    Instrumentation = require('./lib/apm');

  // Set up the connect function
  var connect = require('./lib/mongo_client').connect;

  // Set up the instrumentation method
  function instrument(options, callback) {
    if(typeof options == 'function') callback = options, options = {};
    return new Instrumentation(core, options, callback);
  }

  return {
  // Expose error class
    MongoError: core.MongoError,
    // Actual driver classes exported
    Admin: require('./lib/admin'),
    MongoClient: require('./lib/mongo_client'),
    Db: require('./lib/db'),
    Collection: require('./lib/collection'),
    Server: require('./lib/server'),
    ReplSet: require('./lib/replset'),
    Mongos: require('./lib/mongos'),
    ReadPreference: require('./lib/read_preference'),
    GridStore: require('./lib/gridfs/grid_store'),
    Chunk: require('./lib/gridfs/chunk'),
    Logger: core.Logger,
    Cursor: require('./lib/cursor'),
    GridFSBucket: require('./lib/gridfs-stream'),
    // Exported to be used in tests not to be used anywhere else
    CoreServer: require('mongodb-core').Server,
    CoreConnection: require('mongodb-core').Connection,
    // BSON types exported
    Binary: core.BSON.Binary,
    Code: core.BSON.Code,
    Map: core.BSON.Map,
    DBRef: core.BSON.DBRef,
    Double: core.BSON.Double,
    Int32: core.BSON.Int32,
    Long: core.BSON.Long,
    MinKey: core.BSON.MinKey,
    MaxKey: core.BSON.MaxKey,
    ObjectID: core.BSON.ObjectID,
    ObjectId: core.BSON.ObjectID,
    Symbol: core.BSON.Symbol,
    Timestamp: core.BSON.Timestamp,
    Decimal128: core.BSON.Decimal128,
    // Add connect method
    connect: connect,
    instrument: instrument
  };
}



// Set our exports to be the connect function
module.exports = connect;
