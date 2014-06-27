var fs          = require('fs');
var path_module = require('path');

// TODO: make this configurable
var FILE_SYSTEM_ROOT = __dirname + '/../../contract_filesystem/';
var HASH_REGEX = /^[0-9a-fA-F]{64}$/;

// This regex checks for the presence of the "contract_modules/"
// string at the beginning of the string and captures the module name
// TODO: support windows?
var FILEPATH_ESCAPED_CHARACTERS = '\/\\\?\%\*\:\|\"\<\>\.\,\;\(\)\&\# ';
var CONTRACT_MODULES_STRING = '^\/?contract_modules\/((?:[^' + FILEPATH_ESCAPED_CHARACTERS + ']|\\[' + FILEPATH_ESCAPED_CHARACTERS + '])+)';
var CONTRACT_MODULES_REGEX = new RegExp(CONTRACT_MODULES_STRING);

/**
 *  Read a file using the map specified in the contract
 *  manifest between filenames and hashes.
 *
 *  Note that the contract host MUST verify that the hashes
 *  of the files are correct. This module does not.
 *
 *  @param {Object} manifest
 *  @param {String} data The path or a stringified object containing the path and (optional) options
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {String or Buffer} file_contents
 */
function readFile(manifest, data, callback) {
  // Check if data is a stringified object
  var path;
  var options;
  try {
    var parameters = JSON.parse(data);
    path           = parameters.path;
    options        = parameters.options;
  } catch(error) {
    // Data is not JSON, assume it is just the path
    path = data;
  }

  var file_hash;

  // Normalize path to handle "." and ".."
  path = path_module.normalize(path);

  console.log(path);

  // If the file is declared in this manifest, use that file
  // If not, see if the path refers to a file in one of the contract modules

  // TODO: handle the leading slash better
  var file_hash = manifest.files[path] ||
    manifest.files[path.replace('/', '')] ||
    manifest.files['/' + path] ||
    manifest.files['./' + path];

  if (file_hash) {

    // Case: file declared in this manifest

    if (!HASH_REGEX.test(file_hash)) {
      callback(new Error('Invalid hash. Hash must be 32 bytes written in hexadecimal form'));
      return;
    }

    // If the file is declared in this manifest, simply read it
    // and pass the results to the callback
    // TODO: actually handle differently encoded files here
    // TODO: make this async
    var contents;
    try {
      contents = String(fs.readFileSync(FILE_SYSTEM_ROOT + file_hash, options));
    } catch(error) {
      callback(error);
      return;
    }
    callback(null, contents);
    return;

  } else if (CONTRACT_MODULES_REGEX.test(path)) {

    // Case: path refers to a file within a module

    // Determine the name of the module the path refers to
    var module_name = CONTRACT_MODULES_REGEX.exec(path)[1];
    if (!manifest.modules || !manifest.modules.hasOwnProperty(module_name)) {
      callback(new Error('Module ' + String(module_name) + ' not declared in manifest. All modules must be declared in manifest'));
      return;
    }

    // Load the module manifest
    var module_manifest_hash = manifest.modules[module_name];
    var module_manifest;
    try {
      module_manifest = fs.readFileSync(FILE_SYSTEM_ROOT + module_manifest_hash, { encoding: 'utf8' });
      module_manifest = JSON.parse(module_manifest);
    } catch(error) {
      callback(new Error('Cannot load manifest for module: ' + module_name + '. ' + error));
      return;
    }

    // Replace the contract_modules/module_name part of the path
    var path_in_module = path.replace(CONTRACT_MODULES_REGEX, '');

    // Recursively call readFile on the module
    setImmediate(function(){
      readFile(module_manifest, path_in_module, callback);
    });
    return;

  } else {

    // Case: unknown path

    callback(new Error('File not found. Cannot locate ' + String(path) + ' in contract files or included modules'));
    return;
  }

}

module.exports.readFile = readFile;
