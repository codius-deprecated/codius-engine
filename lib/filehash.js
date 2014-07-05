var crypto = require('crypto');

var FileHash = {};

/**
 *  Hash the given data and return 32 bytes of the hash.
 *
 *  @param {String} data
 *  @param {String} ['utf8'] encoding
 *
 *  @returns {String} hash 32 bytes of the SHA512 hash
 */
FileHash.hash = function (data) {
  var hashing_function = crypto.createHash('sha512');
  hashing_function.update(data);
  var hash_result = hashing_function.digest('hex');
  return hash_result.slice(0, 64);
};

exports.FileHash = FileHash;
