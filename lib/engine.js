var fs = require('fs');
var Runner = require('./contractrunner').ContractRunner;
var Config = require('./config').Config;

function Engine(config) {
  var self = this;

  if (!config) {
    config = new Config();
  }

  self.config = config;

  // All of the APIs the engine has access to
  self._apis = {};

  // _contract_instances is a map where the keys are the hash
  // of the contract manifests and the values are arrays of
  // all of the running instances of that contract
  self._contract_instances = {};

  // Register all of the desired APIs
  var FileSystemReadOnly = require(config.apisPath + 'fs');
  self.registerAPI('fs', new FileSystemReadOnly(config.contractsFilesystemPath));
  // TODO: get list of APIs to load from config

  self.registerAPI('foo', config.apisPath + 'foo');
}

Engine.prototype.registerAPI = function(name, module) {
  var self = this;

  if (typeof module === 'string') {
    self._apis[name] = require(module);
  } else if (typeof module === 'function' || typeof module === 'object') {
    self._apis[name] = module;
  }
};

/**
 *  Run the contract specified by the given manifest hash.
 *
 *  @param {String} manifest_hash
 *  @param {String} data
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {String} result
 */
Engine.prototype.runContract = function(manifest_hash, data, callback) {
  var self = this;

  // Contracts can be run without data
  if (typeof data === 'function') {
    callback = data;
    data = '';
  }

  // Load manifest file
  var manifest_path = self.config.contractsFilesystemPath + manifest_hash;
  var manifest = fs.readFileSync(manifest_path, { encoding: 'utf8' });
  try {
    manifest = JSON.parse(manifest);
  } catch(error) {
    callback(new Error('Error parsing manifest: ' + error));
    return;
  }

  // Setup available APIs
  var contract_apis = {};
  if (typeof manifest.apis === 'object' && manifest.apis.length > 0) {
    manifest.apis.forEach(function(api_name){
      if (self._apis[api_name]) {
        contract_apis[api_name] = self._apis[api_name];
      }
    });
  }

  // Create a new runner to run this contract
  var runner = new Runner(self.config, {
    manifest: manifest,
    apis: contract_apis,
    manifest_hash: manifest_hash
  });

  // Add this runner to the engine's list
  if (!self._contract_instances[manifest_hash]) {
    self._contract_instances[manifest_hash] = [];
  }
  self._contract_instances[manifest_hash].push(runner);

  var runner_index = self._contract_instances[manifest_hash].length - 1;

  // Once the runner is finished, remove it from _contract_instances
  runner.run(data, function(error, result){
    self._contract_instances[manifest_hash][runner_index] = null;

    // If there are no more running instances of this contract,
    // remove the manifest hash from _contract_instances
    var running_instances = false;
    for (var instance = 0; instance < self._contract_instances[manifest_hash].length; instance++) {
      if (self._contract_instances[manifest_hash][instance]) {
        running_instances = true;
        break;
      }
    }
    if (!running_instances) {
      delete self._contract_instances[manifest_hash];
    }

    if (typeof callback === 'function') {
      callback(error, result);
    }
  });
};

exports.Engine = Engine;
