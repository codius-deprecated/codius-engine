exports.init = function (engine, config) {
  engine.registerAPI('net', function (runner){
    return new NetworkApi(runner);
  });
};


var net = require('net');
var util = require('util');

var ApiModule = require('../../lib/api_module').ApiModule;
var ProxiedSocket = require('./proxied_socket').ProxiedSocket;

function NetworkApi(runner) {
  ApiModule.call(this);

  var self = this;

  this._runner = runner;
  this._connections = [null, null, null, null];
  this._ports = [];
}

util.inherits(NetworkApi, ApiModule);

NetworkApi.methods = [
  'socket',
  'connect',
  'read',
  'write',
  'bind',
  'accept',
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
    sock.bind(this, family, address, port, callback);
  } else {
    throw new Error('Invalid connection ID');
  }
};

NetworkApi.prototype.accept = function (connectionId, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.accept(this._connections, callback);
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

/**
 * Return a listener function for a certain port.
 *
 * This allows the outside to simulate connections to the sandbox.
 *
 * This method will return a function that takes one parameter, a stream that
 * will be piped into the virtual socket.
 */
NetworkApi.prototype.getPortListener = function (port) {
  return this._ports[port];
};

/**
 * Register a new virtual listener.
 *
 * This should only be called by ProxiedSocket.
 */
NetworkApi.prototype.addPortListener = function (port, listener) {
  this._ports[port] = listener;
  this._runner.notifyAboutPortListener(port, listener);
};
