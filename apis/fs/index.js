var fs = require('fs');

// TODO: make this configurable
var FILE_SYSTEM_ROOT = __dirname + '/../../contract_filesystem/';
var HASH_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 *  Read a file using the map specified in the contract
 *  manifest between filenames and hashes.
 *
 *  Note that the contract host MUST verify that the hashes
 *  of the files are correct. This module does not.
 *
 *  @param {Object} manifest
 *  @param {String} data The filename or a stringified object containing the filename and (optional) options
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {String or Buffer} file_contents
 */
function readFile(manifest, data, callback) {
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

  if (!manifest.files) {
    callback(new Error('No files declared in manifest. All files must be declared in contract manifest'));
    return;
  }

  var file_hash = manifest.files[filename];

  // TODO: recursively check packages for files

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

module.exports.readFile = readFile;
