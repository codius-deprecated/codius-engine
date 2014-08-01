var crypto     = require('crypto');
var bitcoinjs  = require('bitcoinjs-lib');
var BigInteger = require('bigi');
var ecurve     = require('ecurve');

exports.deriveSecret  = deriveSecret;
exports.deriveKeypair = deriveKeypair;
exports.sign          = sign;
exports.verify        = verify;

/**
 *  Derive a "child" secret from a "parent" one using HMAC.
 *
 *  @param {String} parent_secret
 *  @param {String} child_name
 *  @param {String} ['sha512'] hash_algorithm
 *
 *  @returns {String} Note that the number of bits depends on the hash algorithm used
 */
function deriveSecret(parent_secret, child_name, hash_algorithm) {
  if (!hash_algorithm) {
    hash_algorithm = 'sha512';
  }

  return crypto.createHmac(hash_algorithm, parent_secret).update(child_name).digest('hex');
}

/**
 *  Derive a public and private key from a "parent" secret.
 *
 *  @param {String} parent_secret
 *  @param {String} child_name
 *  @param {String} ['secp256k1'] signature_scheme
 *
 *  @returns {Object} Object with "public" and "private" fields
 */
function deriveKeypair(parent_secret, child_name, signature_scheme) {
  if (!signature_scheme) {
    signature_scheme = 'ec_secp256k1';
  }

  var pair = {};

  if (signature_scheme === 'ec_secp256k1') {

    pair.private = deriveSecret(parent_secret, child_name, 'sha256');

    // If the private key is greater than the curve modulus we
    // use a counter to get a new random secret
    var modulus = new BigInteger(ecurve.getCurveByName('secp256k1').n, 16);
    var counter = 1;
    while (!pair.private || modulus.compareTo(pair.private) < 0) {
      pair.private = deriveSecret(parent_secret, child_name + '_' + counter, 'sha256');
      counter += 1;
    }

    pair.public = new bitcoinjs.ECKey(new BigInteger(pair.private, 16), false).pub.toHex();

  } else {

    throw new Error('Signature scheme: ' + signature_scheme + ' not currently supported');

  }

  return pair;
}

/**
 *  Sign the given data
 *
 *  ** For now assumes ec_secp256k1 **
 *
 *  @param {String} private_key Hex-encoded private key
 *  @param {String} data Hex-encoded data
 */
function sign(private_key, data) {
  var key = new bitcoinjs.ECKey(new BigInteger(private_key, 16), false);
  var hash = bitcoinjs.crypto.hash256(new Buffer(data, 'hex'));
  return key.sign(hash).toDER().toString('hex');
}

/**
 *  Verify a signature on the given data
 *
 *  ** For now assumes ec_secp256k1 **
 *
 *  @param {String} public_key Hex-encoded public key
 *  @param {String} data Hex-encoded data
 *  @param {String} signature Hex-encoded signature
 */
function verify(public_key, data, signature) {
  var pubkey = bitcoinjs.ECPubKey.fromHex(public_key);
  var hash = bitcoinjs.crypto.hash256(new Buffer(data, 'hex'));
  var ecsignature = bitcoinjs.ECSignature.fromDER(new Buffer(signature, 'hex'));
  return pubkey.verify(hash, ecsignature);
}



