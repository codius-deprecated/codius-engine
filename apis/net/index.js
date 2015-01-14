//------------------------------------------------------------------------------
/*
    This file is part of Codius: https://github.com/codius
    Copyright (c) 2014 Ripple Labs Inc.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose  with  or without fee is hereby granted, provided that the above
    copyright notice and this permission notice appear in all copies.

    THE  SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH  REGARD  TO  THIS  SOFTWARE  INCLUDING  ALL  IMPLIED  WARRANTIES  OF
    MERCHANTABILITY  AND  FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY  SPECIAL ,  DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER  RESULTING  FROM  LOSS  OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION  OF  CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
//==============================================================================

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
  this._connections = [];
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
  'close',
  'getRemoteFamily',
  'getRemotePort',
  'getRemoteAddress'
];

NetworkApi.prototype.socket = function (domain, type, protocol, callback) {
  sock = new ProxiedSocket(domain, type, protocol);
  var connectionId = this._runner.getNextFreeFileDescriptor();
  this._connections[connectionId] = sock;
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
    sock.accept(this._connections, this._runner, callback);
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

NetworkApi.prototype.getRemoteFamily = function (connectionId, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.getRemoteFamily(callback);
  } else {
    throw new Error('Invalid connection ID');
  }
};

NetworkApi.prototype.getRemotePort = function (connectionId, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.getRemotePort(callback);
  } else {
    throw new Error('Invalid connection ID');
  }
};

NetworkApi.prototype.getRemoteAddress = function (connectionId, callback) {
  var sock = this._connections[connectionId];
  if (sock) {
    sock.getRemoteAddress(callback);
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
