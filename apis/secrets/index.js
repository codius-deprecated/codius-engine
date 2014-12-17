//------------------------------------------------------------------------------
/*
    This file is part of Codius: https://github.com/codius
    Copyright (c) 2014 Ripple Labs Inc.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose  with  or without fee is hereby granted, provided that the above
    copyright notice and this permission notice appear in all copies.

    THE  SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH  REGARD  TO  THIS  SOFTWARE  INCLUDING  ALL  IMPLIED  WARRANTIES  OF
    MERCHANTABILITY  AND  FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY  SPECIAL ,  DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER  RESULTING  FROM  LOSS  OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION  OF  CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
//==============================================================================

var crypto = require('../../lib/crypto');
var util = require('util');
var ApiModule = require('../../lib/api_module').ApiModule;

exports.init = function(engine, config, secrets) {
  engine.registerAPI('secrets', function(runner){
    var manifest = runner.getManifest();
    return new SecretGenerator(manifest, secrets);
  });
};

/**
 *  Class used to deterministically generate unique contract secrets
 */
function SecretGenerator(manifest, secrets) {
  ApiModule.call(this);

  var self = this;

  self._manifest = manifest;
  self._secrets = secrets;
}

util.inherits(SecretGenerator, ApiModule);

SecretGenerator.methods = [
  'getSecret',
  'getKeypair'
];

/**
 *  Get a deterministic 512-bit secret that is unique to the contract.
 *
 *  @param {String} manifest.manifest_hash
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {String} secret Hex-encoded 512-bit secret
 *
 */
SecretGenerator.prototype.getSecret = function(data, callback) {
  var self = this;

  var manifest_hash = self._manifest.manifest_hash;
  if (!manifest_hash) {
    throw new Error('SecretGenerator.getSecret not given manifest_hash, meaning it cannot derive unique contract secrets');
  }

  var secret;
  try {
    secret = crypto.deriveSecret(self._secrets.CONTRACT_SECRET_GENERATOR, 'CONTRACT_SECRET_' + manifest_hash, 'sha512');
  } catch (error) {
    callback(new Error('Error deriving contract secret: ' + error));
    return;
  }

  callback(null, secret);
};

/**
 *  Get a deterministic keypair that is unique to the contract.
 *
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {Object} keypair Object with "public" and "private" fields that are hex-encoded strings
 *
 */
SecretGenerator.prototype.getKeypair = function(data, callback) {
  var self = this;

  var manifest_hash = self._manifest.manifest_hash;
  if (!manifest_hash) {
    throw new Error('SecretGenerator.getKeypair not given manifest_hash, meaning it cannot derive unique contract keypairs');
  }

  if (data === 'ec_secp256k1') {

    var keypair;
    try {

      keypair = crypto.deriveKeypair(self._secrets.CONTRACT_KEYPAIR_GENERATOR_ec_secp256k1, 'CONTRACT_KEYPAIR_ec_secp256k1_' + manifest_hash, 'ec_secp256k1');
      keypair.signature = crypto.sign(self._secrets.MASTER_KEYPAIR_ec_secp256k1.private, keypair.public);

    } catch (error) {
      callback(new Error('Error deriving contract keypair: ' + error));
      return;
    }

  } else {
    callback(new Error('Signature scheme not supported' + String(data)));
    return;
  }

  callback(null, keypair);

};
