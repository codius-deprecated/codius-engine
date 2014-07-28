var util = require('util');
var events = require('events');
var fs = require('fs');
var path = require('path');

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

  if (!fs.existsSync(_this.config.contracts_filesystem_path)) {
    fs.mkdirSync(_this.config.contracts_filesystem_path);
  }

  // Read existing manifest or create a new one
  var manifest;
  var manifest_path = path.join(contractPath, _this.config.manifest_filename);
  if (fs.existsSync(manifest_path)) {
    try {
      manifest = fs.readFileSync(manifest_path, { encoding: 'utf8' });
      manifest = JSON.parse(manifest);
    } catch(error) {
      throw new Error('Error parsing manifest: ' + error);
    }
  } else {
    manifest = _this.generateManifest(contractPath);
  }

  if (!manifest.files) {
    manifest.files = [];
  }
  if (!manifest.modules) {
    manifest.modules = [];
  }
  if (!manifest.apis) {
    manifest.apis = [];
  }

  // Main file is implicitly added to the files array
  if (Array.isArray(manifest.files) && manifest.files.indexOf(manifest.main) === -1) {
    manifest.files.push(manifest.main);
  }
  // TODO What if manifest.files is a map already?

  // The files field can be provided as an array, in which case we still need
  // to go in and calculate the hashes
  if (Array.isArray(manifest.files)) {
    var fileHashMap = {};
    manifest.files.forEach(function (filename) {
      var file = fs.readFileSync(path.resolve(contractPath, filename));
      var hash = FileHash.hash(file);
      fileHashMap[filename] = hash;
    });
    manifest.files = fileHashMap;
  }

  // Now we emit events for each file in the manifest
  Object.keys(manifest.files).forEach(function (filename) {
    var file = fs.readFileSync(path.resolve(contractPath, filename));
    var hash = manifest.files[filename];

    _this.emit('file', {
      data: file,
      hash: hash
    });
  });

  // Next we need to recurse to process modules as well
  if (Array.isArray(manifest.modules)) {
    var modules_path = path.join(contractPath, 'codius_modules');
    var modulesMap = {};
    manifest.modules.forEach(function(module_name){
      var module_path = path.join(modules_path, module_name);
      var module_hash = _this.compileModule(module_path, _this.config.contracts_filesystem_path);
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
    hash: manifestHash
  });

  return manifestHash;
}

Compiler.prototype.generateManifest = function (contractPath) {
  var _this = this;

  var manifest = {};
  manifest_path_array = contractPath.replace(/\/$/, '').split(path.sep);
  manifest.name = manifest_path_array[manifest_path_array.length - 1];
  manifest.apis = _this.config.default_manifest_apis;
  manifest.files = {};
  manifest.modules = [];

  // Set main file
  if (!manifest.main) {
    // If there is only one file in the directory that must be the main file
    var files_in_dir = fs.readdirSync(contractPath);
    if (files_in_dir.length === 1) {
      manifest.main = files_in_dir[0];
    } else {

      // If there is more than one file in the directory then possible main files
      // include all of the standard ones, plus "{module name}.js"
      var main_possibilities = _this.config.default_main_filenames;
      main_possibilities.push(manifest.name + '.js');

      for (var m = 0; m < main_possibilities.length; m++) {
        var main_path = path.join(contractPath, main_possibilities[m]);
        if (fs.existsSync(main_path)) {
          manifest.main = main_possibilities[m];
          break;
        }
      }
    }
  }

  // Go through all files and subdirectory files
  // excluding the codius_modules
  var files = _this.findAllFiles(contractPath, [_this.config.manifest_filename, 'codius_modules']);
  files.forEach(function(full_file_path){
    var file = fs.readFileSync(full_file_path);
    var hash = FileHash.hash(file);

    var relative_path = full_file_path.replace(new RegExp(contractPath + '\/*'), '');
    manifest.files[relative_path] = hash;
  });

  // Call this function on each of the modules found in the codius_modules dir
  var modules_path = path.join(contractPath, 'codius_modules');
  if (fs.existsSync(modules_path) && fs.statSync(modules_path).isDirectory()) {
    manifest.modules = fs.readdirSync(modules_path);
  } else {
    manifest.modules = [];
  }

  return manifest;
};

/**
 *  Recursively search through the given dir to find
 *  the full paths of all of the files.
 *
 *  @param {String} dir
 *  @param {Array} [null] exclude_list A list of filenames or directory names to skip
 *
 *  @returns {Array} files Array of full paths for all files in dir
 */
Compiler.prototype.findAllFiles = function (dir, exclude_list) {
  var _this = this;

  var files = [];
  var dir_contents = fs.readdirSync(dir);
  dir_contents.forEach(function(filename){
    if (exclude_list && exclude_list.indexOf(filename) !== -1) {
      return;
    }
    var file_path = path.resolve(dir, filename);
    var file_stats = fs.statSync(file_path);
    if (file_stats.isFile()) {
      files.push(file_path);
    } else if (file_stats.isDirectory()) {
      files.join(_this.findAllFiles(file_path));
    }
  });
  return files;
}

exports.Compiler = Compiler;
