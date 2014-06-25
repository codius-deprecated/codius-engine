var fs = require('fs');

// TODO: make this configurable
var FILE_SYSTEM_ROOT = __dirname + '/../../contract_filesystem/';
var HASH_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 *  This is a read-only filesystem module.
 *  Contracts that specify files, along with their hashes,
 *  in the manifest file can read from them using this API module.
 *
 *  @param {Object} contract_files Map of filenames to hashes
 */
function FileSystem(contract_files) {
  var self = this;

  if (typeof contract_files === 'object') {
    self._file_hash_map = contract_files;
  } else {
    self._file_hash_map = {};
  }
}

/**
 *  Read a file using the map specified in the contract
 *  manifest between filenames and hashes.
 *
 *  Note that the contract host MUST verify that the hashes
 *  of the files are correct. This module does not.
 *
 *  @param {String} data The filename or a stringified object containing the filename and (optional) options
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {String or Buffer} file_contents
 */
FileSystem.prototype.readFile = function(data, callback) {
  var self = this;

  console.log('readFile ', self._file_hash_map)

  // Check if data is a stringified object
  var filename;
  var options;
  try {
    var parameters = JSON.parse(data);
    filename       = parameters.filename;
    options        = parameters.options;
  } catch(error) {
    // Data is not JSON, assume it is just the filename
    filename = data;
  }

  var file_hash = self._file_hash_map[filename];

  // Double check the file_hash
  if (typeof file_hash !== 'string') {
    callback(new Error('File not found. All files must be declared in contract manifest'));
    return;
  }
  if (!HASH_REGEX.test(file_hash)) {
    callback(new Error('Invalid hash. Hash must be 32 bytes written in hexadecimal form'));
    return;
  }

  fs.readFile(FILE_SYSTEM_ROOT + file_hash, options, callback);
};

module.exports = FileSystem;
