var fs = require('fs');
var path = require('path');
var crypto = require('./crypto');
var Runner = require('./contractrunner').ContractRunner;
var Config = require('./config').Config;

var MASTER_SECRET_REGEX = /^[0-9a-fA-F]{64}$/;

function Engine(config) {
  var self = this;

  if (!config) {
    config = new Config();
  }

  self.config = config;

  // Generate the engine secrets used to generate
  // contract-specific secrets and keypairs, as well
  // as the host's keypairs to sign the contracts' public keys
  if (!MASTER_SECRET_REGEX.test(config.MASTER_SECRET)) {
    config.logger.warn('No secret provided! Generating a random secret, please do not do this in production.');
    config.MASTER_SECRET = crypto.getRandomMasterSecret();
  }
  self._secrets = self.generateSecrets(config.MASTER_SECRET);

  // All of the APIs the engine has access to
  self._apis = {};

  // _contract_instances is a map where the keys are the hash
  // of the contract manifests and the values are arrays of
  // all of the running instances of that contract
  self._contract_instances = {};

  // Register all of the desired APIs
  config.apis.forEach(function (apiName) {
    // The initialization function is what sets up all of the modules' hooks and modules

    if (apiName === 'secrets') {
      require(path.resolve(config.apisPath, apiName)).init(self, self.config, self._secrets);
    } else {
      require(path.resolve(config.apisPath, apiName)).init(self, self.config);
    }
  });
}

Engine.prototype.registerAPI = function(name, module) {
  var self = this;

  self._apis[name] = module;
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
        contract_apis[api_name] = self._apis[api_name](manifest, data);
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

/**
 *  Generate the host's secrets from the MASTER_SECRET
 *
 *  @param {String} MASTER_SECRET
 *
 *  @returns {Object}
 */
Engine.prototype.generateSecrets = function(MASTER_SECRET) {

  var secrets = {};

  secrets.CONTRACT_SECRET_GENERATOR = crypto.deriveSecret(MASTER_SECRET, 'CONTRACT_SECRET_GENERATOR');

  secrets.CONTRACT_KEYPAIR_GENERATOR_ec_secp256k1 = crypto.deriveSecret(MASTER_SECRET, 'CONTRACT_KEYPAIR_GENERATOR_ec_secp256k1', 'sha256');

  secrets.MASTER_KEYPAIR_ec_secp256k1 = crypto.deriveKeypair(MASTER_SECRET, 'MASTER_KEYPAIR_ec_secp256k1', 'ec_secp256k1');

  return secrets;

};

/**
 *  Get the engine's master public key
 *
 *  @param {String} ['ec_secp256k1'] signature_scheme
 *
 *  @returns {String} public_key
 */
Engine.prototype.getMasterPublicKey = function(signature_scheme) {
  if (!signature_scheme) {
    signature_scheme = 'ec_secp256k1';
  }

  if (signature_scheme === 'ec_secp256k1') {
    return self._secrets.MASTER_KEYPAIR_ec_secp256k1.public;
  } else {
    throw new Error('Signature scheme: ' + signature_scheme + ' not currently supported.');
  }
};


exports.Engine = Engine;
