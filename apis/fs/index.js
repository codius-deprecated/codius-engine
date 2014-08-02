exports.init = function (engine, config) {
  engine.registerAPI('fs', function(manifest){
    return new FileSystemReadOnly(config.contractsFilesystemPath, manifest);
  });
};


var fs          = require('fs');
var path_module = require('path');

var CODIUS_MODULES_REGEX = /^(?:(?:\.\/|\/)?codius_modules\/)((?:\\\/|[^\/])+)(?:\/)?/i;
var CODIUS_MANIFEST_REGEX = /^((\.\/|\/)?codius-manifest.json)/i;

// module.exports = FileSystemReadOnly;

function FileSystemReadOnly(sandbox_filesystem_path, manifest) {
  var self = this;

  self._manifest = manifest;
  self._sandbox_filesystem_path = sandbox_filesystem_path;
}

/**
 *  Synchronous read file. See _readFile for details.
 *
 *  @param {String} path
 *
 *  @returns {raw results from fs.readFileSync}
 */
FileSystemReadOnly.prototype.readFileSync = function(path) {
  var self = this;
  return self._readFile(self._manifest, path, { encoding: 'utf8' });
};

/**
 *  Asynchronous read file. See _readFile for details.
 *
 *  @param {String} data Stringified object with `path` and `options` fields
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {results from fs.readFile} result
 */
FileSystemReadOnly.prototype.readFile = function(data, callback) {
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

  self._readFile(self._manifest, path, options, callback);
};


/**
 *  Helper function to read files based on the permissions outlined
 *  in the manifest, either async or sync. All files are addressed in the
 *  filesystem by the hash of their contents. However, entities can only
 *  request files by hash that they have declared explicitly in the
 *  manifest.files field or files that are declared in submodules.
 *
 *  @param {String} path
 *  @param {Object} [{}] options
 *  @param {Function} [null -- makes function sync] callback
 */
FileSystemReadOnly.prototype._readFile = function(manifest, path, options, callback) {
  var self = this;

  path = path_module.normalize(path);

  if (CODIUS_MANIFEST_REGEX.test(path)) {
    // Case: the file requested is this manifest

    var manifest_string = JSON.stringify(manifest);
    if (callback) {
      callback(null, manifest_string);
      return;
    } else {
      return manifest_string;
    }

  } else if (CODIUS_MODULES_REGEX.test(path)) {
    // Case: the file requested is in a submodule

    var module_name = CODIUS_MODULES_REGEX.exec(path)[1];
    if (!manifest.modules[module_name]) {
      return _handleError(new Error('Module "' + String(module_name) + '" not declared in manifest. All modules must be declared in manifest.'), callback);
    }

    // Load module manifest
    var module_manifest_hash = manifest.modules[module_name];
    var module_manifest;
    try {
      module_manifest = fs.readFileSync(self._sandbox_filesystem_path + module_manifest_hash, { encoding: 'utf8' });
      module_manifest = JSON.parse(module_manifest);
    } catch(error) {
      return _handleError(new Error('Cannot load manifest for module: "' + String(module_name) + '". ' + error));
    }

    // Recurse
    var rest_of_path = path.replace(CODIUS_MODULES_REGEX, '');
    return self._readFile(module_manifest, rest_of_path, options, callback);

  } else {
    // Case: we're looking for a file declared in this manifest

    var normalized_path = path_module.normalize(path);

    var declared_files = Object.keys(manifest.files);
    for (var f = 0; f < declared_files.length; f++) {
      if (normalized_path === path_module.normalize(declared_files[f])) {
        return _readFileFromFullPath(self._sandbox_filesystem_path + manifest.files[declared_files[f]], options, callback)
      }
    }
  }

  // If we get here that means we couldn't find the file
  return _handleError(new Error('File or module: "' + String(path) + '" not found. Cannot locate it in contract files or included modules.'));
};

// Helper function that handles errors sync or async
function _handleError(error, callback) {
  if (typeof callback === 'function') {
    callback(error);
    return;
  } else {
    throw error;
  }
}

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

