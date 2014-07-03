var fs     = require('fs');
var path   = require('path');
var crypto = require('crypto');

var API_FINDER_REGEX = /postMessage[\s\S]*?api:[ ]*['"](\w+)['"]/gm;
var MAIN_FILE_NAMES = ['contract.js', 'index.js', 'main.js'];

module.exports = compileModule;

// This file can be required or run on its own as a command line script
// To run the CLI, `node compile-contract.js <contract_dir> <filesystem_dir>`
if (process.argv && process.argv[1] === __filename && process.argv.length === 4) {
  var contract_dir = path.resolve(__dirname, process.argv[2]);
  var filesystem_dir = path.resolve(__dirname, process.argv[3]);

  var contract_hash = compileModule(contract_dir, filesystem_dir);
  console.log('module_hash: ' + contract_hash);
}

/**
 *  Compile the given contract or module, creating the manifest,
 *  populating it with the `name`, `main`, `files`, `modules`, and `apis` fields,
 *  and writing all of the files to the filesystem.
 *
 *  @param {String} contract_dir Absolute path of the contract or module to compile
 *  @param {String} filesystem_dir Absolute path of the contract filesystem folder
 *
 *  @returns {String} contract_hash The hash of the contract's manifest
 */
function compileModule(contract_dir, filesystem_dir) {
  if (!fs.existsSync(filesystem_dir)) {
    fs.mkdirSync(filesystem_dir);
  }

  // Read existing manifest or create a new one
  var manifest;
  var manifest_path = path.join(contract_dir, 'manifest.json');
  if (fs.existsSync(manifest_path)) {
    try {
      manifest = fs.readFileSync(manifest_path, { encoding: 'utf8' });
      manifest = JSON.parse(manifest);
    } catch(error) {
      throw new Error('Error parsing manifest: ' + error);
    }
  } else {
    manifest = {};
    manifest_path_array = contract_dir.replace(/\/$/, '').split(path.sep);
    manifest.name = manifest_path_array[manifest_path_array.length - 1];
  }

  if (!manifest.files) {
    manifest.files = {};
  }
  if (!manifest.modules) {
    manifest.modules = {};
  }
  if (!manifest.apis) {
    manifest.apis = [];
  }

  // Set main file
  if (!manifest.main) {

    // Possibilities include all of the standard ones, plus "{module name}.js"
    var main_possibilities = MAIN_FILE_NAMES.slice();
    main_possibilities.push(manifest.name + '.js');

    for (var m = 0; m < main_possibilities.length; m++) {
      var main_path = path.join(contract_dir, main_possibilities[m]);
      if (fs.existsSync(main_path)) {
        manifest.main = main_possibilities[m];
        break;
      }
    }

  }

  // Go through all files and subdirectory files
  // excluding the contract_modules
  var files = findAllFiles(contract_dir, ['manifest.json', 'contract_modules']);
  files.forEach(function(full_file_path){
    var file = fs.readFileSync(full_file_path, { encoding: 'utf8' });

    var file_hash = hashData(file);
    writeToFileSystem(file_hash, file, filesystem_dir);
    var relative_path = full_file_path.replace(new RegExp(contract_dir + '\/*'), '');
    manifest.files[relative_path] = file_hash;

    var apis = findAllApis(file);
    apis.forEach(function(api){
      if (manifest.apis.indexOf(api) === -1) {
        manifest.apis.push(api);
      }
    });
  });

  // Call this function on each of the modules found in the contract_modules dir
  var modules_path = path.join(contract_dir, 'contract_modules');
  if (fs.existsSync(modules_path) && fs.statSync(modules_path).isDirectory()) {

    var modules = fs.readdirSync(modules_path);
    modules.forEach(function(module_name){
      var module_path = path.join(modules_path, module_name);
      var module_hash = compileModule(module_path, filesystem_dir);
      manifest.modules[module_name] = module_hash;
    });

  }

  // Write manifest and return its hash
  var pretty_manifest = JSON.stringify(manifest, null, '  ');
  var manifest_hash = hashData(pretty_manifest);
  writeToFileSystem(manifest_hash, pretty_manifest, filesystem_dir);

  return manifest_hash;
}

/**
 *  Hash the given data and return 32 bytes of the hash.
 *
 *  @param {String} data
 *  @param {String} ['utf8'] encoding
 *
 *  @returns {String} hash 32 bytes of the SHA512 hash
 */
function hashData(data, encoding) {
  var hashing_function = crypto.createHash('sha512');
  hashing_function.update(data, encoding || 'utf8');
  var hash_result = hashing_function.digest('hex');
  return hash_result.slice(0, 64);
}

/**
 *  Write the given file to the filesystem using
 *  the file's hash as its filename
 */
function writeToFileSystem(hash, file, filesystem_dir) {
  var file_path = path.join(filesystem_dir, hash);
  if (!fs.existsSync(file_path)) {
    fs.writeFileSync(file_path, file);
  }
}

/**
 *  Recursively search through the given dir to find
 *  the full paths of all of the files.
 *
 *  @param {String} dir
 *  @param {Array} [null] exclude_list A list of filenames or directory names to skip
 *
 *  @returns {Array} files Array of full paths for all files in dir
 */
function findAllFiles(dir, exclude_list) {
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
      files.join(findAllFiles(file_path));
    }
  });
  return files;
}

/**
 *  Use the API_FINDER_REGEX to search the
 *  given file string for the APIs it uses and
 *  return a duplicate-free array of api names
 *
 *  @param {String} file_string
 *
 *  @param {Array} apis
 */
function findAllApis(file_string) {
  var apis = {};
  var match;
  while(match = API_FINDER_REGEX.exec(file_string)) {
    apis[match[1].toLowerCase()] = 1;
    API_FINDER_REGEX.lastIndex = match.index + 1;
  }
  API_FINDER_REGEX.lastIndex = -1;
  return Object.keys(apis);
}
