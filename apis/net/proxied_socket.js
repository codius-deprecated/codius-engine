var net = require('net');
var SystemError = require('../../lib/system_error').SystemError;

var ProxiedSocket = function (domain, type, protocol) {
  if (ProxiedSocket.SUPPORTED_FAMILIES.indexOf(domain) === -1) {
    throw new Error("Unsupported socket domain: "+domain);
  }

  if (type !== ProxiedSocket.SOCK_STREAM) {
    throw new Error("Unsupported socket type: "+type);
  }

  if (protocol !== 0) {
    throw new Error("Unsupported protocol: "+protocol);
  }

  this._socket = null;
  this._buffer = [];
  this._waiting_incoming_connections = [];
  this._eof = false;
}

ProxiedSocket.AF_INET = 2;
ProxiedSocket.AF_INET6 = 10;

ProxiedSocket.SOCK_STREAM = 1;

ProxiedSocket.SUPPORTED_FAMILIES = [
  ProxiedSocket.AF_INET,
  ProxiedSocket.AF_INET6
];

ProxiedSocket.prototype.connect = function (family, address, port, callback) {
  var self = this;

  if (ProxiedSocket.SUPPORTED_FAMILIES.indexOf(family) === -1) {
    throw new Error("Unsupported socket domain: "+family);
  }

  var addressArray = [
    address       & 0xff,
    address >>  8 & 0xff,
    address >> 16 & 0xff,
    address >> 24 & 0xff
  ];

  // Convert endianness
  port = (port >> 8 & 0xff) + (port << 8 & 0xffff);
  self._socket = net.createConnection({
    port: port,
    host: addressArray.join('.')
  });
  self._socket.once('connect', function (e) {
    console.log('ProxiedSocket connected to ' + addressArray.join('.') + ':' + port);
    callback(null, 0);
  });

  self._socket.on('data', function(data) {
    self._buffer.push(data);
  });

  self._socket.on('end', function () {
    self._eof = true;
  });

  self._socket.on('error', function(error){
    console.log('socket error: ', error);
  });
};

ProxiedSocket.prototype.bind = function (netApi, family, address, port, callback) {
  var self = this;

  // TODO-CODIUS: Actually honor the family choice

  if (ProxiedSocket.SUPPORTED_FAMILIES.indexOf(family) === -1) {
    throw new Error("Unsupported socket domain: "+family);
  }

  if (netApi.getPortListener(port)) {
    // Port is already bound
    callback(SystemError.create(address+':'+port, 'EADDRINUSE', 'bind'));
  } else {
    console.log('contract listening on port '+port);
    netApi.addPortListener(port, function(stream) {
      // We have a connection - a socket object will be assigned to the connection with accept()
      self._waiting_incoming_connections.push(stream);

      // console.log('Fake socket server connected to: ' + stream.remoteAddress +':'+ stream.remotePort);
    });

    callback(null, 0);
  }
};

ProxiedSocket.prototype.accept = function(connections, callback) {
  var self = this;

  if (self._waiting_incoming_connections.length) {
    var stream = self._waiting_incoming_connections.shift();
    var peer_sock = new ProxiedSocket(ProxiedSocket.AF_INET, ProxiedSocket.SOCK_STREAM, 0);
    peer_sock._socket = stream;
    peer_sock._socket.on('data', function(data) {
      peer_sock._buffer.push(data);
    });
    peer_sock._socket.on('end', function () {
      peer_sock._eof = true;
    });
    var connectionId = connections.length;
    connections.push(peer_sock);
    callback(null, connectionId);
  } else {
    // EAGAIN
    callback(null, -11);
  }
};

ProxiedSocket.prototype.read = function (maxBytes, callback) {
  var self = this;

  if (!self._buffer.length && this._eof) {
    // UV_EOF (end of file)
    callback(null, -4095);
    return;
  } else if (!self._buffer.length) {
    // EAGAIN (no data, try again later)
    callback(null, -11);
    return;
  }

  var buffer = self._buffer.shift();
  if (buffer.length > maxBytes) {
    self._buffer.unshift(buffer.slice(maxBytes));
    buffer = buffer.slice(0, maxBytes);
  }

  callback(null, buffer.toString('hex'));
};

ProxiedSocket.prototype.write = function (stringToWrite, callback) {
  var self = this;

  self._socket.write(stringToWrite);
  callback(null);
}

ProxiedSocket.prototype.close = function (callback) {
  var self = this;

  self._socket.destroy();
  callback(null);
}

ProxiedSocket.prototype.getRemoteFamily = function (callback) {
  var self = this;

  var family = self._socket._getpeername().family;
  if (family === 'IPv4') {
    callback(null, ProxiedSocket.AF_INET);
  } else if (family === 'IPv6') {
    callback(null, ProxiedSocket.AF_INET6);
  } else {
    throw new Error("Unsupported socket family: " + family);
  }
}

ProxiedSocket.prototype.getRemotePort = function (callback) {
  var self = this;

  callback(null, self._socket._getpeername().port);
}

ProxiedSocket.prototype.getRemoteAddress = function (callback) {
  var self = this;

  callback(null, self._socket._getpeername().address);
}

exports.ProxiedSocket = ProxiedSocket;
