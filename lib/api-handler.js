module.exports = ApiHandler;

/**
 *  The class responsible for directing calls from
 *  sandboxed code to the correct API Module and
 *  responding with the results.
 *
 *  @param {Object} data.manifest
 *  @param {Object} data.apis API modules to load automatically
 */
function ApiHandler(data) {
  var self = this;

  if (typeof data !== 'object' ||
    typeof data.manifest !== 'object' ||
    typeof data.apis !== 'object') {

    throw new Error('ApiHandler must be instantiated with the manifest and available apis');
  }

  self._manifest = data.manifest;
  self._api_modules = {};

  if (typeof data.apis === 'object') {
    Object.keys(data.apis).forEach(function(api_name){
      self.registerApi(api_name, data.apis[api_name]);
    });
  }
}

/**
 *  Register a given api_module so it can be
 *  called by sandboxed code.
 *
 *  Note that all accessible methods should be included
 *  in the API Module's `module.exports`.
 *
 *  @param {String} name
 *  @param {Object} api_module
 */
// Note that all accessible methods should be included in the
// API Module's module.exports
ApiHandler.prototype.registerApi = function(name, api_module) {
  var self = this;

  // TODO: validate module and manifest

  var module_name = name;
  if (typeof module_name !== 'string') {
    throw new Error('Module name not declared in manifest!');
  }

  self._api_modules[module_name] = api_module;

};

// API Modules' module.export functions should expect a data string and a callback

/**
 *  Call the specified method, in the specified module,
 *  with the contract manifest, the given data, and the callback
 *
 *  @param {String} parameters.module
 *  @param {String} parameters.method
 *  @param {String} parameters.data
 *  @param {Function} callback
 */
ApiHandler.prototype.callApi = function(parameters, callback) {
  var self = this;

  var module = self._api_modules[parameters.module];
  if (!module) {
    callback(new Error('Unknown API Module: ' + parameters.module));
    return;
  }

  // Bind the method to the context of the module so that module methods
  // assigned to a class' prototype are called with the right this value
  var method = module[parameters.method].bind(module);
  if (typeof method !== 'function') {
    callback(new Error('Unknown API Method: ' + parameters.module + '.' + parameters.method));
    return;
  }

  console.log('callApi called got: ', parameters);

  method(self._manifest, parameters.data, callback);

};

/**
 *  Function to handle messages sent from within the sandbox.
 *
 *  @param {Sandbox} sandbox
 *  @param {String} message_string Stringified message JSON object
 */
ApiHandler.prototype.handleMessage = function(sandbox, message_string) {
  var self = this;

  var message;
  try {
    message = JSON.parse(String(message_string));
  } catch(error) {
    throw new Error('Invalid message: ' + String(message_string));
  }

  console.log('got message: ', message);

  var parameters = {
    module: message.module,
    method: message.method,
    data: message.data
  };
  var contract_callback = function(error, result) {
    console.log('contract_callback got error:', error, 'result:', result);
    sandbox.postMessage(JSON.stringify({
      type: 'callback',
      callback: message.callback,
      error: error,
      result: result
    }));
  };

  self.callApi(parameters, contract_callback);

};
