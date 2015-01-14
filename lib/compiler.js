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

var util = require('util');
var events = require('events');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var ignore = require('ignore');

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
  this.ignoreFiles = config.ignoreFiles || ['.codiusignore'];

  this._filesystem = Compiler.RealFilesystem;
};

util.inherits(Compiler, events.EventEmitter);

/**
 *  Compile the given contract or module, creating the manifest,
 *  populating it with the `name`, `main`, `files`, `modules`, and `apis` fields,
 *  and writing all of the files to the filesystem.
 *
 *  @param {String} contractPath Absolute path of the contract or module to compile
 *  @param {Object} manifest Optionally pass in a full or partially filled out manifest
 *
 *  @returns {String} contract_hash The hash of the contract's manifest
 */
Compiler.prototype.compileModule = function (contractPath, manifest) {
  var _this = this;

  contractPath = contractPath || '';

  // Read existing manifest or create a new one
  if (!manifest) {
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
  _this._ensureEnvProperty(manifest, contractPath);

  // Now we emit events for each file in the manifest
  _this._emitFileEvents(manifest.files, contractPath);

  // Next we need to recurse to process modules as well
  var modulesPath = path.join(contractPath, 'node_modules');
  if (Array.isArray(manifest.modules)) {
    var modulesMap = {};
    manifest.modules.forEach(function(moduleName){
      // TODO: node_modules/.bin should be included in the files, not the modules
      if (moduleName === '.bin') {
        return;
      }
      var modulePath = path.join(modulesPath, moduleName);
      var moduleHash = _this.compileModule(modulePath);
      modulesMap[moduleName] = moduleHash;
    });
    manifest.modules = modulesMap;
  } else if ("object" === typeof manifest.modules) {
    _.each(manifest.modules, function (expectedModuleHash, moduleName) {
      // TODO: node_modules/.bin should be included in the files, not the modules
      if (moduleName === '.bin') {
        return;
      }
      var modulePath = path.join(modulesPath, moduleName);
      var moduleHash = _this.compileModule(modulePath);
      if (moduleHash !== expectedModuleHash) {
        throw new Error('Error parsing manifest: Incorrect hash for module: ' + moduleName);
      }
    });
  }

  // Write manifest and return its hash
  var prettyManifest = JSON.stringify(manifest, null, '  ');
  var manifestBuffer = new Buffer(prettyManifest, 'utf-8');
  var manifestHash = FileHash.hash(manifestBuffer);

  _this.emit('file', {
    data: manifestBuffer,
    hash: manifestHash,
    name: path.join(contractPath, 'codius-manifest.json'),
    isManifest: true
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
      if (_this._filesystem.exists(path.resolve(contractPath, 'package.json'))) {
        try {
          var package_json = _this._filesystem.readFile(path.resolve(contractPath, 'package.json'));
          var package_main = JSON.parse(package_json).main;
          if (typeof package_main === 'string') {
            main_possibilities.push(package_main);
            main_possibilities.push(package_main+'.js');
            main_possibilities.push(package_main+'.json');
            main_possibilities.push(package_main+'/index.js');
            main_possibilities.push(package_main+'/index.json');

            // NOTE Node.js also allows .node, but since we don't allow native
            //      modules, we cannot support that yet.
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

  if (!manifest.main) {
    throw new Error('Contract has no main file in '+contractPath);
  }
};

Compiler.prototype._ensureFilesProperty = function (manifest, contractPath) {
  var _this = this;

  if (!manifest.files) {
    // Go through all files and subdirectory files
    // excluding the node_modules
    manifest.files = _this._findAllFiles(contractPath, [_this.config.manifestFilename, 'node_modules', '.git', _this.config.configFilename]);
    manifest.files = manifest.files.map(function (path) {
      return path.substr(contractPath.length + 1);
    });
  } else if (typeof manifest.files !== 'object') {
    throw new Error('Invalid manifest, `files` must be an array or object');
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
        throw new Error('Invalid manifest `files` property, arrays may only contain strings, not "'+
                        (typeof filename) + '"');
      }

      var file = self._filesystem.readFile(path.join(filepath, filename));
      var hash = FileHash.hash(file);
      fileHashMap[filename] = hash;
    });

    return self._expandFilesProperty(fileHashMap, filepath);
  } else if (files && typeof files === 'object') {
    var outputFiles = {};
    _.forOwn(files, function (value, key) {

      if (typeof key !== 'string') {
        throw new Error('Invalid manifest `files` property, non-string key encountered in object.');
      }

      if (value && typeof value !== 'string') {
        value = self._expandFilesProperty(value, path.join(filepath, key));
      }

      // Expand path string into nested objects
      // {'foo/bar/baz': value} => {foo: {bar: {baz: value}}}
      var nestedValue = value;
      key.split('/').reverse().forEach(function (pathComponent) {
        var nextLayer = {};
        nextLayer[pathComponent] = nestedValue;
        nestedValue = nextLayer;
      });

      // Merge the resulting objects together into one object.
      _.merge(outputFiles, nestedValue);
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
 * Load env property from codius-config.json if it exists
 */
Compiler.prototype._ensureEnvProperty = function (manifest, contractPath) {
  var _this = this;

  // Do not overwrite env if it is explicitly declared
  if (manifest.env) {
    return;
  }

  var configPath = path.join(contractPath, _this.config.configFilename);
  var config;
  if (_this._filesystem.exists(configPath)) {
    var configFile = _this._filesystem.readFile(configPath, 'utf8');
    try {
      config = JSON.parse(configFile);
    } catch (err) {
      throw new Error('Invalid JSON: ' + configPath);
      return;
    }

    if (config.env) {
      manifest.env = config.env;
    }
  }

  if (!manifest.env) {
    manifest.env = {};
  }
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
Compiler.prototype._findAllFiles = function (dir, exclude_list, files, parent_ignores) {
  var _this = this;

  if (!files) files = [];

  var ignoreFilter = _this._createIgnoreFilter(dir, parent_ignores);

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
      _this._findAllFiles(file_path, [], files);
    }
  });

  files = files.filter(ignoreFilter);

  return files;
};

Compiler.prototype._createIgnoreFilter = function(dir, parent_ignores) {
  var _this = this;

  if (!_this.ignoreFiles || _this.ignoreFiles.length === 0) {
    return function(path) {
      return true;
    };
  }

  var ignoreRules;
  if (parent_ignores && parent_ignores.length > 0) {
    ignoreRules = parent_ignores.slice();
  } else {
    ignoreRules = [];
  }

  _this.ignoreFiles.forEach(function(ignoreFile){
    var ignoreFilePath = path.join(dir, ignoreFile);
    if (_this._filesystem.exists(ignoreFilePath)) {
      var rules = _this._filesystem.readFile(ignoreFilePath, 'utf8').split('\n');
      ignoreRules = ignoreRules.concat(rules);
    }
  });

  return ignore({
    ignore: ignoreRules
  }).createFilter();
};

Compiler.prototype.setFilesystem = function (filesystem) {
  this._filesystem = filesystem;
};

Compiler.RealFilesystem = {
  readFile: fs.readFileSync.bind(fs),
  stat: fs.statSync.bind(fs),
  readdir: fs.readdirSync.bind(fs),
  exists: fs.existsSync.bind(fs)
};

exports.Compiler = Compiler;
