exports.init = function (engine, config) {
  engine.registerAPI('crypto', function (runner){
    return new CryptoApi();
  });
};


var crypto = require('crypto');
var util = require('util');

var ApiModule = require('../../lib/api_module').ApiModule;

function CryptoApi() {
  ApiModule.call(this);

  var self = this;
}

util.inherits(CryptoApi, ApiModule);

CryptoApi.methods = [
  'randomBytes'
];

CryptoApi.prototype.randomBytes = function (size, callback) {
  crypto.randomBytes(size, function (error, bytes) {
    if (error) {
      callback(error);
    } else {
      callback(null, bytes.toString('hex'));
    }
  });
};
