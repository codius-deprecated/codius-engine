var net = require('net');

var ProxiedSocket = function (domain, type, protocol) {
  if (domain !== ProxiedSocket.AF_INET) {
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
  this._sockets_to_accept = [];
  this._eof = false;
}

ProxiedSocket.AF_INET = 2;

ProxiedSocket.SOCK_STREAM = 1;

ProxiedSocket.prototype.connect = function (family, address, port, callback) {
  var self = this;

  if (family != ProxiedSocket.AF_INET) {
    throw new Error("Unsupported socket family: "+family);
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

ProxiedSocket.prototype.bind = function (family, address, port, callback) {
  var self = this;

  if (family != ProxiedSocket.AF_INET) {
    throw new Error("Unsupported socket family: "+family);
  }

  var addressArray = [
    address       & 0xff,
    address >>  8 & 0xff,
    address >> 16 & 0xff,
    address >> 24 & 0xff
  ];

  // Convert endianness
  port = (port >> 8 & 0xff) + (port << 8 & 0xffff);

  self._socket=net.createServer(function(sock) {
    self._socket.on('error', function(error){
      console.log('socket error: ', error);
    });

    // We have a connection - a socket object will be assigned to the connection with accept()
    self._sockets_to_accept.push(sock);

    // console.log('Fake socket server connected to: ' + sock.remoteAddress +':'+ sock.remotePort);

  }).listen(port, addressArray.join('.'));

  callback(null, 0);
};

ProxiedSocket.prototype.accept = function() {
  var self = this;

  return self._sockets_to_accept.shift();
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

exports.ProxiedSocket = ProxiedSocket;
