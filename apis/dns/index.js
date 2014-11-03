exports.init = function (engine, config) {
  engine.registerAPI('dns', function (runner){
    return new DnsApi();
  });
};


var dns = require('dns');
var util = require('util');

var ApiModule = require('../../lib/api_module').ApiModule;

function DnsApi() {
  ApiModule.call(this);

  var self = this;
}

util.inherits(DnsApi, ApiModule);

DnsApi.methods = [
  'lookup'
];

DnsApi.prototype.lookup = function (hostname, family, callback) {
  if (typeof family === 'function') {
    callback = family;
    family = 0;
  }

  dns.lookup(hostname, family, callback);
};
