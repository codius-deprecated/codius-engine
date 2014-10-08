exports.init = function (engine, config) {
  engine.registerAPI('net', function (runner){
    return new NetworkApi();
  });
};


var net = require('net');
var util = require('util');

var ApiModule = require('../../lib/api_module').ApiModule;
var ProxiedSocket = require('./proxied_socket').ProxiedSocket;

function NetworkApi() {
  ApiModule.call(this);

  var self = this;

  this._connections = [];
}

util.inherits(NetworkApi, ApiModule);

NetworkApi.methods = [
  'socket',
  'connect',
  'read',
  'write',
  'bind',
  'close'
];

NetworkApi.prototype.socket = function (domain, type, protocol, callback) {
  sock = new ProxiedSocket(domain, type, protocol);
  var connectionId = this._connections.length;
  this._connections.push(sock);
  callback(null, connectionId);
};

NetworkApi.prototype.connect = function (connectionId, family, address, port, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.connect(family, address, port, callback);
  } else {
    throw new Error('Invalid connection ID');
  }
};

NetworkApi.prototype.read = function (connectionId, maxBytes, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.read(maxBytes, callback);
  } else {
    throw new Error('Invalid connection ID');
  }
};

NetworkApi.prototype.bind = function (connectionId, family, address, port, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.bind(family, address, port, callback);
  } else {
    throw new Error('Invalid connection ID');
  }
};

NetworkApi.prototype.close = function (connectionId, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.close(callback);
    this._connections[connectionId] = void(0);
  } else {
    throw new Error('Invalid connection ID');
  }
};

NetworkApi.prototype.write = function (connectionId, data, dataFormat, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    var buffer;
    if (dataFormat === 'hex') {
      buffer = new Buffer(data, 'hex');
    } else {
      throw new Error('Invalid data format for socket write.');
    }
    sock.write(buffer, callback);
  } else {
    throw new Error('Invalid connection ID');
  }
};
