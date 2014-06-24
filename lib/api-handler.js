module.exports = ApiHandler;

/**
 *  The class responsible for directing calls from
 *  sandboxed code to the correct API Module and
 *  responding with the results.
 */
function ApiHandler() {
  var self = this;

  self._api_modules = {};
}

/**
 *  Register a given api_module so it can be
 *  called by sandboxed code.
 *
 *  Note that all accessible methods should be included
 *  in the API Module's `module.exports`.
 *
 *  @param {Object} module_manifest
 *  @param {Object} api_module
 */
// Note that all accessible methods should be included in the
// API Module's module.exports
ApiHandler.prototype.registerApi = function(module_manifest, api_module) {
  var self = this;

  // TODO: validate module and manifest

  var module_name = module_manifest.name;
  if (typeof module_name !== 'string') {
    throw new Error('Module name not declared in manifest!');
  }

  self._api_modules[module_name] = api_module;

};

// API Modules' module.export functions should expect a data string and a callback

/**
 *  Call the specified method, in the specified module,
 *  with the given data and then pass the result to the callback
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

  var method = module[parameters.method];
  if (typeof method !== 'function') {
    callback(new Error('Unknown API Method: ' + parameters.module + '.' + parameters.method));
    return;
  }

  console.log('callApi called got: ', parameters);

  method(parameters.data, callback);

};
