var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var extend = require('extend');
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

/**
 *  Register a new API module factory with the engine.
 *  When a new contract is run each API module factory will
 *  be called with a reference to the ContractRunner (which
 *  includes the manifest and manifest hash, among other things).
 *  The function registered here should return a new instace
 *  of the API module's class, which should inherit from the 
 *  ApiModule abstract class. 
 *
 *  @param {String} name
 *  @param {Function} moduleFactory
 */
Engine.prototype.registerAPI = function(name, moduleFactory) {
  var self = this;

  self._apis[name] = moduleFactory;
};

/**
 *  Takes a function that will be connected to the
 *  LocalStorage API to provide contracts with persistent storage.
 *  Each function should take the contract hash as the first
 *  parameter. Otherwise, each function follows the browser
 *  LocalStorage API.
 *
 *  @param {Function} contractStorage.getItem
 *  @param {Function} contractStorage.setItem
 *  @param {Function} contractStorage.removeItem
 *  @param {Function} contractStorage.clear
 *  @param {Function} contractStorage.key
 */
Engine.prototype.setContractStorage = function(contractStorage) {
  var self = this;

  if (self._apis.localstorage) {
    self._apis.localstorage = _.partialRight(self._apis.localstorage, contractStorage);
  }
};

/**
 *  Run the contract specified by the given manifest hash.
 *
 *  @param {String} manifest_hash
 *  @param {Object} opts.env Environment variables to expose to sandboxed code
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {String} result
 */
Engine.prototype.runContract = function(manifest_hash, opts) {
  var self = this;

  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  opts = opts || {};

  // Load manifest file
  var firstDir = manifest_hash.slice(0, 2);
  var secondDir = manifest_hash.slice(2, 4);
  var manifest_path = path.join(self.config.contractsFilesystemPath, firstDir, secondDir, manifest_hash);
  var manifest = fs.readFileSync(manifest_path, { encoding: 'utf8' });
  try {
    manifest = JSON.parse(manifest);
  } catch(error) {
    callback(new Error('Error parsing manifest: ' + error));
    return;
  }

  // Load contract environment variables
  var contract_env = opts.env || {};
  if (manifest.env && typeof manifest.env === 'object') {
    contract_env = manifest.env;
  } else {
    contract_env = {};
  }

  if (opts.env) {
    contract_env = extend(contract_env, opts.env);
  }

  if (!contract_env.PORT && self.config.virtual_port) {
    contract_env.PORT = self.config.virtual_port;
  }

  // Create a new runner to run this contract
  var runner = new Runner(self.config, {
    manifest: manifest,
    manifest_hash: manifest_hash,
    additional_libs: self.config.additional_libs,
    env: contract_env
  });

  // Setup available APIs
  // Each runner will get its own instances of all of the APIs
  var contract_apis = {};
  if (typeof manifest.apis === 'object' && manifest.apis.length > 0) {
    manifest.apis.forEach(function(api_name){
      if (self._apis.hasOwnProperty(api_name)) {
        var createApiHandlerInstance = self._apis[api_name];
        contract_apis[api_name] = createApiHandlerInstance(runner);
      }
    });
  }
  runner.setApis(contract_apis);

  if (self.config.legacySandbox) {
    // TODO Remove when ending support for old sandbox
    runner.runLegacy();
  } else {
    runner.run();
  }

  return runner;
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
