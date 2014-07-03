var fs          = require('fs');
var path_module = require('path');

// Matches if the string starts with "./" or "/"
var FILE_REGEX             = /^(?:\.?\/)((?:\\\/|[^\/])+)/i;

// Matches if the string starts with any of the following:
// - "{module}"
// - "/{module}"
// - "./{module}"
// - "contract_modules/{module}"
// - "/contract_modules/{module}"
// - "./contract_modules/{module}"
var CONTRACT_MODULES_REGEX = /^(?:\/|\.\/)*(?:contract_modules\/)?((?:\\\/|[^\/])*)[\/]*/i;

module.exports = FileSystemReadOnly;

function FileSystemReadOnly(sandbox_filesystem_path) {
  var self = this;
  self._sandbox_filesystem_path = sandbox_filesystem_path;
}

/**
 *  Synchronous read file. See _readFile for details.
 *
 *  @param {Object} manifest
 *  @param {String} path
 *
 *  @returns {raw results from fs.readFileSync}
 */
FileSystemReadOnly.prototype.readFileSync = function(manifest, path) {
  var self = this;
  return self._readFile(manifest, path, { encoding: 'utf8' });
};

/**
 *  Asynchronous read file. See _readFile for details.
 *
 *  @param {Object} manifest
 *  @param {String} data Stringified object with `path` and `options` fields
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {results from fs.readFile} result
 */
FileSystemReadOnly.prototype.readFile = function(manifest, data, callback) {
  var self = this;
  var path;
  var options;
  try {
    var json = JSON.parse(data);
    path = json.path;
    options = json.options;
  } catch(error) {
    callback(new Error('Invalid data. Must be stringified JSON object with `path` and `options` fields'));
    return;
  }

  self._readFile(manifest, path, options, callback);
};


/**
 *  Helper function to read files based on the permissions outlined
 *  in the manifest, either async or sync. All files are addressed in the
 *  filesystem by the hash of their contents. However, entities can only
 *  request files by hash that they have declared explicitly in the
 *  manifest.files field or files that are declared in submodules.
 *
 *  _readFile first checks if the path matches a file declared in the
 *  manifest.files. If the file is not, it will check if the file path
 *  begins with `contract_modules/{module}`. If so, it will recursively
 *  call itself on that module's manifest, which is referenced by
 *  hash in the manifest.modules section.
 *
 *  @param {Object} manifest
 *  @param {String} path
 *  @param {Object} [{}] options
 *  @param {Function} [null -- makes function sync] callback
 */
FileSystemReadOnly.prototype._readFile = function(manifest, path, options, callback) {
  var self = this;

  // Check if the path refers to the main file in this manifest
  if (['', '.', './', '/'].indexOf(path) !== -1) {
    var main_file = manifest.main;

    if (!main_file) {
      return _handleError(new Error('No main file declared in manifest of module: "' + String(manifest.name) + '"'));
    }

    var main_file_hash = manifest.files[main_file];
    return _readFileFromFullPath(self._sandbox_filesystem_path + main_file_hash, options, callback);
  }

  // Check if the path refers to a file declared in this manifest
  var matched_file;
  if ((matched_file = _matchDeclaredFile(path, manifest.files))) {
    return _readFileFromFullPath(self._sandbox_filesystem_path + manifest.files[matched_file], options, callback);
  }

  // Check if the path refers to a module or a file within a module
  var module_name;
  if ((module_name = _extractModuleName(path))) {

    var module_manifest_hash = manifest.modules[module_name];
    if (!module_manifest_hash) {
      return _handleError(new Error('Module ' + String(module_name) + ' not declared in manifest. All modules must be declared in manifest'));
    }

    // Load the module's manifest
    var module_manifest;
    try {
      module_manifest = fs.readFileSync(self._sandbox_filesystem_path + module_manifest_hash, { encoding: 'utf8' });
      module_manifest = JSON.parse(module_manifest);
    } catch(error) {
      return _handleError(new Error('Cannot load manifest for module: ' + module_name + '. ' + error));
    }

    var path_within_module = _removeModulePrefix(path);

    // Call _readFile again with the submodule's manifest and the path within that submodule
    return self._readFile(module_manifest, path_within_module, options, callback);

  }

  // If we've gotten here the file was neither in the contract's
  // manifest, nor in a submodule
  return _handleError(new Error('File not found. Cannot locate ' + String(path) + ' in contract files or included modules'));
};

// Helper function that reads the file either sync or async
function _readFileFromFullPath(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  path = path_module.normalize(path);

  if (typeof callback === 'function') {
    fs.readFile(path, options, callback);
    return;
  } else {
    return fs.readFileSync(path, options);
  }
}

// Helper function that handles errors sync or async
function _handleError(error, callback) {
  if (typeof callback === 'function') {
    callback(error);
    return;
  } else {
    throw error;
  }
}

// Check if the path matches one of the given files
function _matchDeclaredFile(path, files) {
  var declared_file_names = Object.keys(files);
  for (var f = 0; f < declared_file_names.length; f++) {
    var possibility = declared_file_names[f];

    if (path === possibility) {
      return possibility;
    }

    // Check if the path matches the possibility when the "./" and "/" prefix are stripped away
    // Note that ".js" files can be required without the extension so we need
    // to check if appending ".js" makes the path match the possibility
    var stripped_path = (FILE_REGEX.test(path) ? FILE_REGEX.exec(path)[1] : path);
    var stripped_possibility = (FILE_REGEX.test(possibility) ? FILE_REGEX.exec(possibility)[1] : possibility);
    if (stripped_path === stripped_possibility ||
      stripped_path + '.js' === stripped_possibility ||
      stripped_path + '.JS' === stripped_possibility) {

      return possibility;
    }
  }
  return null;
}

// If the path starts with a module name or
// "contract_modules/{module name}" return the module name
function _extractModuleName(path) {
  if (CONTRACT_MODULES_REGEX.test(path)) {
    return CONTRACT_MODULES_REGEX.exec(path)[1];
  } else {
    return null;
  }
}

// Remove the module name from the beginning of the path
function _removeModulePrefix(path) {
  return path.replace(CONTRACT_MODULES_REGEX, '');
}
