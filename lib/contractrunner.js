var fs = require('fs');
var crypto = require('crypto');
var events = require('events');
var util = require('util');
var Sandbox = require('codius-sandbox').Sandbox;

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
  self._sandbox  = new Sandbox();
  self._sandbox.debuggerOnCrash = self.config.enableGdb;

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

  var args = parameters.data;
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
ContractRunner.prototype.handleMessage = function(api_name, method_name, args) {
  var self = this;

  var error = null;
  var result = null;

  var parameters = {
    api: api_name
    method: method_name
    data: args
  };

  var callback = function(e, result) {
    error = e;
    result = result;
  }

  self.callApi(parameters, callback);

  if (error == null)
    return {'success': true, 'result': result};
  else
    return {'success': false, 'result': error};
};

ContractRunner.prototype.run = function() {
  var self = this;

  self._sandbox.stdout.pipe(process.stdout);
  self._sandbox.stderr.pipe(process.stderr);

  self._sandbox.onIPC = self.handleMessage.bind(self);
  self._sandbox.spawn('node', self._manifest.main, {env: self._env});
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

exports.ContractRunner = ContractRunner;
