(function(context){
  'use strict';

  // Overwrite require for secrets module (because it does not request an external file)
  var old_require = context.require;
  context.require = function(module_identifier) {
    if (module_identifier === 'secrets') {
      return new Secrets();
    } else {
      return old_require(module_identifier);
    }
  };

  function Secrets() {

  }

  /**
   *  Get a 512-bit hex-encoded deterministic secret that is unique to the contract
   *
   *  @param {Function} callback
   *
   *  @callback
   *  @param {Error} error
   *  @param {String} secret
   */
  Secrets.prototype.getSecret = function(callback) {
    postMessage({
      api: 'secrets',
      method: 'getSecret',
      data: ''
    }, callback);
  };

  /**
   *  Get a keypair for the given signature scheme that is deterministic and unique
   *
   *  @param {String} ['ec_secp256k1'] signature_scheme
   *  @param {Function} callback
   *
   *  @callback
   *  @param {Error} error
   *  @param {String} keypair.public
   *  @param {String} keypair.private
   */
  Secrets.prototype.getKeypair = function(signature_scheme, callback) {
    if (typeof signature_scheme === 'function') {
      callback = signature_scheme;
      signature_scheme = 'ec_secp256k1';
    }

    postMessage({
      api: 'secrets',
      method: 'getKeypair',
      data: signature_scheme
    }, callback);
  };

})(this);
