var fs              = require('fs');
var Sandbox         = require('sandbox');
var runtime_library = require('../runtime_library');

/**
 *  Class to run contracts.
 *
 *  @param {Object} data.manifest
 *  @param {Object} data.apis
 *  @param {String} data.manifest_hash
 */
function ContractRunner(config, data) {
  var self = this;

  self.config = config;

  if (typeof data !== 'object' ||
    typeof data.manifest !== 'object' ||
    typeof data.apis !== 'object') {

    throw new Error('ApiHandler must be instantiated with the manifest and a map of available APIs');
  }

  self._manifest = data.manifest;
  self._apis = data.apis || {};
  self._manifest_hash = data.manifest_hash;

  // Setup sandbox instance
  self._sandbox  = new Sandbox({
    sandbox_filesystem_path: self.config.contracts_filesystem_path,
    timeout: 2000
  });

}

/**
 *  Call the specified method, in the specified module,
 *  with the contract manifest, the given data, and the callback
 *
 *  @param {String} parameters.api
 *  @param {String} parameters.method
 *  @param {String} parameters.data
 *  @param {Function} callback
 */
ContractRunner.prototype.callApi = function(parameters, callback) {
  var self = this;

  var api = self._apis[parameters.api];
  if (!api) {
    callback(new Error('Unknown API Module: ' + parameters.api));
    return;
  }

  // Bind the method to the context of the api so that api methods
  // assigned to a class' prototype are called with the right this value
  var method = api[parameters.method].bind(api);
  if (typeof method !== 'function') {
    callback(new Error('Unknown API Method: ' + parameters.api + '.' + parameters.method));
    return;
  }

  method(self._manifest, parameters.data, callback);
};

/**
 *  Function to handle messages sent from within the sandbox.
 *
 *  @param {String} message_string Stringified message JSON object
 */
ContractRunner.prototype.handleMessage = function(message_string) {
  var self = this;

  var message;
  try {
    message = JSON.parse(String(message_string));
  } catch(error) {
    throw new Error('Invalid message: ' + String(message_string));
  }

  var parameters = {
    api: message.api,
    method: message.method,
    data: message.data
  };
  var contract_callback = function(error, result) {
    self._sandbox.postMessage(JSON.stringify({
      type: 'callback',
      callback: message.callback,
      error: error,
      result: result
    }));
  };

  self.callApi(parameters, contract_callback);

};

ContractRunner.prototype.run = function(data, callback) {
  var self = this;

  var message_handler = self.handleMessage.bind(self);
  self._sandbox.on('message', message_handler);

  // TODO: use data

  // Load main file
  var main_file_hash = self._manifest.files[self._manifest.main];
  var main_file_path = self.config.contracts_filesystem_path + main_file_hash;
  var main = fs.readFileSync(main_file_path, { encoding: 'utf8' });

  // Concatenate the runtime library to the main file
  var code_to_run = runtime_library + ';' + main;

  self._sandbox.run(self._manifest_hash, code_to_run, function(error, result){

    // Remove message listener
    self._sandbox.removeListener('message', message_handler);

    if (typeof callback === 'function') {
      callback(error, result);
    }
  });
};

exports.ContractRunner = ContractRunner;
