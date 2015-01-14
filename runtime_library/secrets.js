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

var codius = process.binding('async');

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
  codius.postMessage({
    type: 'api',
    api: 'secrets',
    method: 'getSecret',
    data: ['']
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

  codius.postMessage({
    type: 'api',
    api: 'secrets',
    method: 'getKeypair',
    data: [signature_scheme]
  }, callback);
};

module.exports = new Secrets;
