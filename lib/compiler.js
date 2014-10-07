var util = require('util');
var events = require('events');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var FileHash = require('./filehash').FileHash;

/**
 * Contracts compiler.
 *
 * This class will parse contract manifests and files and emit events for
 * processing them.
 */
var Compiler = function (config) {
  events.EventEmitter.call(this);

  this.config = config;

  this._filesystem = Compiler.RealFilesystem;
};

util.inherits(Compiler, events.EventEmitter);

/**
 *  Compile the given contract or module, creating the manifest,
 *  populating it with the `name`, `main`, `files`, `modules`, and `apis` fields,
 *  and writing all of the files to the filesystem.
 *
 *  @param {String} contractPath Absolute path of the contract or module to compile
 *
 *  @returns {String} contract_hash The hash of the contract's manifest
 */
Compiler.prototype.compileModule = function (contractPath) {
  var _this = this;

  contractPath = contractPath || '';

  // Read existing manifest or create a new one
  var manifest;
  var manifest_path = path.join(contractPath, _this.config.manifestFilename);
  if (_this._filesystem.exists(manifest_path)) {
    try {
      manifest = _this._filesystem.readFile(manifest_path, { encoding: 'utf8' });
      manifest = JSON.parse(manifest);
    } catch(error) {
      throw new Error('Error parsing manifest: ' + error);
    }
  } else {
    manifest = {};
  }

  // Ensure there is a manifest name property
  if (!manifest.name) {
    var manifest_path_array = contractPath.replace(/\/$/, '').split(path.sep);
    manifest.name = manifest_path_array[manifest_path_array.length - 1];
  }

  // Normalize (or if needed, generate) manifest properties
  _this._ensureMainProperty(manifest, contractPath);
  _this._ensureFilesProperty(manifest, contractPath);
  _this._ensureModulesProperty(manifest, contractPath);
  _this._ensureApisProperty(manifest);

  // Now we emit events for each file in the manifest
  _this._emitFileEvents(manifest.files, contractPath);

  // Next we need to recurse to process modules as well
  if (Array.isArray(manifest.modules)) {
    var modules_path = path.join(contractPath, 'node_modules');
    var modulesMap = {};
    manifest.modules.forEach(function(module_name){
      var module_path = path.join(modules_path, module_name);
      var module_hash = _this.compileModule(module_path, _this.config.contractsFilesystemPath);
      modulesMap[module_name] = module_hash;
    });
    manifest.modules = modulesMap;
  }

  // Write manifest and return its hash
  var prettyManifest = JSON.stringify(manifest, null, '  ');
  var manifestBuffer = new Buffer(prettyManifest, 'utf-8');
  var manifestHash = FileHash.hash(manifestBuffer);

  _this.emit('file', {
    data: manifestBuffer,
    hash: manifestHash,
    name: path.join(contractPath, 'codius-manifest.json')
  });

  return manifestHash;
};

Compiler.prototype._ensureMainProperty = function (manifest, contractPath) {
  var _this = this;

  // Set main file
  if (!manifest.main) {
    // If there is only one file in the directory that must be the main file
    var files_in_dir = _this._filesystem.readdir(contractPath);
    if (files_in_dir.length === 1) {
      manifest.main = files_in_dir[0];
    } else {

      // If there is more than one file in the directory then possible main files
      // include all of the standard ones, plus "{module name}.js"
      var main_possibilities = _this.config.defaultMainFilenames;
      main_possibilities.push(manifest.name + '.js');

      // If package.json is found also add the main file from there
      if (fs.existsSync(path.resolve(contractPath, 'package.json'))) {
        try {
          var package_json = fs.readFileSync(path.resolve(contractPath, 'package.json'));
          var package_main = JSON.parse(package_json).main;
          if (typeof package_main === 'string') {
            main_possibilities.push(package_main);
          }
        } catch (e) {}
      }

      for (var m = 0; m < main_possibilities.length; m++) {
        var main_path = path.join(contractPath, main_possibilities[m]);
        if (_this._filesystem.exists(main_path)) {
          manifest.main = main_possibilities[m];
          break;
        }
      }
    }
  }
};

Compiler.prototype._ensureFilesProperty = function (manifest, contractPath) {
  var _this = this;

  if (!manifest.files) {
    // Go through all files and subdirectory files
    // excluding the node_modules
    manifest.files = _this.findAllFiles(contractPath, [_this.config.manifestFilename, 'node_modules', '.git']);
    manifest.files = manifest.files.map(function (path) {
      return path.substr(contractPath.length + 1);
    });
  } else if (typeof manifest.files !== 'object') {
    throw new Error('Invalid manifest, `files` must be an array or object');
  }

  // Main file is implicitly added to the files array
  if (Array.isArray(manifest.files) && manifest.files.indexOf(manifest.main) === -1) {
    manifest.files.push(manifest.main);
  }

  // Split subpaths into subobjects
  manifest.files = _this._expandFilesProperty(manifest.files, contractPath);

  // TODO Strip off initial slashes
};

Compiler.prototype._expandFilesProperty = function (files, filepath) {
  var self = this;

  // The files field (or any subdirectory) can be provided as an array, in
  // which case we still need to go in and calculate the hashes.
  if (Array.isArray(files)) {
    var fileHashMap = {};
    files.forEach(function (filename) {
      if (typeof filename !== 'string') {
        throw new Error('Invalid manifest `files` property, arrays may only contain strings.');
      }

      var file = self._filesystem.readFile(path.join(filepath, filename));
      var hash = FileHash.hash(file);
      fileHashMap[filename] = hash;
    });

    return self._expandFilesProperty(fileHashMap, filepath);
  } else if (files && typeof files === 'object') {
    var outputFiles = {};
    _.forOwn(files, function (value, key) {
      console.log(key);

      if (typeof key !== 'string') {
        throw new Error('Invalid manifest `files` property, non-string key encountered in object.');
      }

      if (value && typeof value !== 'string') {
        value = self._expandFilesProperty(value, path.join(filepath, key));
      }

      // Expand paths if necessary
      var targetObj, targetPath;
      if (key.indexOf('/') !== -1) {
        var separatorPos = key.indexOf('/');
        var folder = key.substr(0, separatorPos);
        if (!outputFiles[folder]) {
          outputFiles[folder] = {};
        }
        targetObj = outputFiles[folder];
        targetPath = key.substr(separatorPos+1);
      } else {
        targetObj = outputFiles;
        targetPath = key;
      }

      // If the subpath already exists, we need to merge it with the new value
      if (targetObj[targetPath]) {
        if (typeof value === 'string' || typeof targetObj[targetPath] === 'string') {
          throw new Error('Invalid manifest `files` property, encountered a file with the same name as a directory.');
        }

        _.merge(targetObj[targetPath], value);
      } else {
        targetObj[targetPath] = value;
      }
    });

    return outputFiles;
  } else {
    throw new Error('Invalid manifest `files` property, every directory definition must be an object or an array.');
  }
};

Compiler.prototype._ensureModulesProperty = function (manifest, contractPath) {
  var _this = this;

  if (!manifest.modules) {
    // Call this function on each of the modules found in the node_modules dir
    var modules_path = path.join(contractPath, 'node_modules');
    if (_this._filesystem.exists(modules_path) && _this._filesystem.stat(modules_path).isDirectory()) {
      manifest.modules = _this._filesystem.readdir(modules_path);
    } else {
      manifest.modules = [];
    }
  }
};

Compiler.prototype._ensureApisProperty = function (manifest, contractPath) {
  var _this = this;

  if (!manifest.apis) {
    manifest.apis = [];
  }

  // Make sure at least the default manifest apis are requested
  manifest.apis = _.union(manifest.apis, _this.config.defaultManifestApis);
};

Compiler.prototype._emitFileEvents = function (files, basepath) {
  var self = this;

  _.forIn(files, function (hash, filename) {
    // This is actually a subdirectory, so let's recurse
    if (typeof hash === 'object') {
      self._emitFileEvents(hash, path.join(basepath, filename));

    // This is a file
    } else if (typeof hash === 'string') {
      var file = self._filesystem.readFile(path.join(basepath, filename));
      self.emit('file', {
        data: file,
        hash: hash,
        name: path.join(basepath, filename)
      });
    } else {
      throw new Error('Invalid type.');
    }
  });
};

/**
 * Recursively search through the given dir to find
 * the full paths of all of the files.
 *
 * Can be overridden using setFindAllFiles.
 *
 * @param {String} dir
 * @param {Array} [null] exclude_list A list of filenames or directory names to skip
 *
 * @returns {Array} files Array of full paths for all files in dir
 */
Compiler.prototype.findAllFiles = function (dir, exclude_list, files) {
  var _this = this;

  if (!files) files = [];

  var dir_contents = _this._filesystem.readdir(dir);
  dir_contents.forEach(function(filename){
    if (exclude_list && exclude_list.indexOf(filename) !== -1) {
      return;
    }
    var file_path = path.join(dir, filename);
    var file_stats = _this._filesystem.stat(file_path);
    if (file_stats.isFile()) {
      files.push(file_path);
    } else if (file_stats.isDirectory()) {
      _this.findAllFiles(file_path, [], files);
    }
  });

  return files;
};

Compiler.prototype.setFilesystem = function (filesystem) {
  this._filesystem = filesystem;
};

Compiler.RealFilesystem = {
  readFile: function (filename) {
    return fs.readFileSync(filename);
  },
  stat: function (filename) {
    return fs.statSync(filename);
  },
  readdir: function (dirname) {
    return fs.readdirSync(dirname)
  },
  exists: function (filename) {
    return fs.existsSync(filename);
  }
};

exports.Compiler = Compiler;
