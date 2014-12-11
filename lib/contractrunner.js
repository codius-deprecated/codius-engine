var fs = require('fs');
var crypto = require('crypto');
var events = require('events');
var util = require('util');

// TODO Call 'require' here when ending support for old sandbox
// var Sandbox = require('codius-sandbox').Sandbox;
// var path = require('path');
var Sandbox;
var path;

/**
 *  Class to run contracts.
 *
 *  @param {Object} data.manifest
 *  @param {Object} data.apis
 *  @param {String} data.manifest_hash
 */
function ContractRunner(config, data) {
  events.EventEmitter.call(this);

  var self = this;

  self.config = config;

  if (typeof data !== 'object' ||
    typeof data.manifest !== 'object') {

    throw new Error('ApiHandler must be instantiated with the manifest');
  }

  self._manifest = data.manifest;
  self._apis = {};
  self._manifest_hash = data.manifest_hash;
  self._additional_libs = data.additional_libs || '';
  self._env = data.env || {};
  self._nextFreeFileDescriptor = 4;

  // Add the manifest_hash to the manifest object so it will
  // be passed to the API modules when they are called
  self._manifest.manifest_hash = data.manifest_hash;

  // Setup sandbox instance
  switch (self.config.sandboxMode) {
    case 'seccomp':
      Sandbox = require('codius-sandbox').Sandbox;
      path = require('path');
      self._sandbox  = new Sandbox();
      self._sandbox.debuggerOnCrash = self.config.enableGdb;
      break;
    case 'nacl':
      // TODO Remove when ending support for old sandbox
      Sandbox = require('codius-node-sandbox');
      self._sandbox  = new Sandbox({
        enableGdb: self.config.enableGdb,
        enableValgrind: self.config.enableValgrind,
        disableNacl: self.config.disableNacl
      });
      break;
    // TODO Handle no sandbox mode
    // case 'none':
    default:
      throw new Error('Invalid sandbox mode');
  }

  self._sandbox.on('exit', self.handleExit.bind(self));
}

util.inherits(ContractRunner, events.EventEmitter);

/**
 * Expose a set of APIs to the running contract.
 *
 * Calling this method will overwrite any previously exposed APIs.
 */
ContractRunner.prototype.setApis = function(apis) {
  this._apis = apis;
};

/**
 *  Call the specified method, in the specified module,
 *  with the contract manifest, the given data, and the callback
 *
 *  @param {String} parameters.api
 *  @param {String} parameters.method
 *  @param {Object} parameters.data
 *  @param {Function} callback
 */
ContractRunner.prototype.callApi = function(parameters, callback) {
  var self = this;

  if (!self._apis.hasOwnProperty(parameters.api)) {
    callback(new Error('Unknown or undeclared API Module: ' + parameters.api));
    return;
  }
  var api = self._apis[parameters.api];

  if (parameters.method.indexOf('_') === 0) {
    callback(new Error('Cannot access private method: ' + parameters.method));
    return;
  }

  var method = api.getMethod(parameters.method);
  if (typeof method !== 'function') {
    callback(new Error('Unknown API Method: ' + parameters.api + '.' + parameters.method));
    return;
  }

  var args = [];
  if (parameters.data)
    args = parameters.data;
  args.push(callback);
  method.apply(api, args);
};


/**
 *  Function to handle messages sent from within the sandbox.
 *
 *  @param {String} message.api
 *  @param {String} message.method
 *  @param {Object} [[]] message.data
 *  @param {Function} callback
 */
// TODO Remove when ending support for old sandbox
ContractRunner.prototype.handleMessageLegacy = function(message, callback) {
  var self = this;

  if (typeof message !== 'object' || !message.api || !message.method) {
    callback(new Error('Invalid message: must pass an object with the fields `api`, `method`, and optionally `data`.'));
    return;
  }

  var parameters = {
    api: message.api,
    method: message.method,
    data: message.data
  };

  self.callApi(parameters, callback);
};


/**
 *  Function to handle messages sent from within the sandbox.
 *
 *  @param {String} message.api
 *  @param {String} message.method
 *  @param {Object} [[]] message.data
 *  @param {Function} callback
 */
ContractRunner.prototype.handleMessage = function(api_name, method_name, args, cookie) {
  var self = this;

  var error = null;
  var result = null;

  var parameters = {
    api: api_name,
    method: method_name,
    data: args
  };

  var callback = function(error, result) {
    if (error)
      result = {'success': false, 'result': result};
    else
      result = {'success': true, 'result': result};

    self._sandbox.finishIPC (cookie, result);
  }

  self.callApi(parameters, callback);
};


// TODO Remove when ending support for old sandbox
ContractRunner.prototype.runNacl = function() {
  var self = this;

  var message_handler = self.handleMessageLegacy.bind(self);
  self._sandbox.setApi(message_handler);

  self._sandbox.passthroughStdio();

  self._sandbox.run(self._manifest.main, { env: self._env });
};


ContractRunner.prototype.run = function() {
  var self = this;

  self._sandbox.stdout.pipe(process.stdout);
  self._sandbox.stderr.pipe(process.stderr);

  self._sandbox.onIPC = self.handleMessage.bind(self);

  var sandboxAPIPath = path.resolve(__dirname + '/../node_modules/codius-sandbox/build/Debug/');
  var sandboxAPIFile = sandboxAPIPath + '/codius-api.node';

  self._sandbox.mapFilename = function(fname) {
    if (fname == "/usr/lib/node/codius-api.node") {
      return sandboxAPIFile;
    }
    return fname;
  }

  self._sandbox.onVFS = function(cookie, name) {
    var callback = function(error, result) {
      if (process.env.CODIUS_DEBUG) {
        if (name == 'read')
          console.log ("vfs finish", name, error, "[...]");
        else
          console.log ("vfs finish", name, error, result);
      }
      if (error) {
        if (error.errno)
          result = {'error': error.errno, 'result': null};
        else
          result = {'error': 38, 'result': null}; //ENOSYS
      } else {
        result = {'error': 0, 'result': result}
      }
      self._sandbox.finishVFS (cookie, result);
    };

    args = [];
    for (i = 2; i < arguments.length; i++) {
      args.push (arguments[i]);
    }

    params = {
      api: 'fs',
      method: name,
      data: args
    };

    if (process.env.CODIUS_DEBUG)
      console.log ('vfs start', params);
    self.callApi (params, callback);
  };

  self._sandbox.addToVFSWhitelist (sandboxAPIFile);
  self._sandbox.spawn('node', '/contract/' + self._manifest.main, {env: self._env});
};

ContractRunner.prototype.getManifest = function () {
  return this._manifest;
};

ContractRunner.prototype.getManifestHash = function () {
  return this._manifest_hash;
};

ContractRunner.prototype.getPortListener = function (port) {
  if (!this._apis.net) {
    throw new Error('Tried to simulate a listener for a contract that does not support networking.');
  }

  return this._apis.net.getPortListener(port);
};

ContractRunner.prototype.notifyAboutPortListener = function (port, listener) {
  this.emit('portListener', {
    port: port,
    listener: listener
  });
};

ContractRunner.prototype.getNextFreeFileDescriptor = function () {
  return this._nextFreeFileDescriptor++;
};

ContractRunner.prototype.handleExit = function (code, signal) {
  var self = this;

  self.emit('exit', code, signal);
}

exports.ContractRunner = ContractRunner;
