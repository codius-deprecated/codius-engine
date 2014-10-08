var path = require('path');
var extend = require('extend');

function Config(opts) {
  extend(this, Config.defaults);
  extend(this, opts);
}

Config.defaults = {
  /**
   * Path where the virtual contracts filesystem lives on the physical disk.
   */
  contractsFilesystemPath: path.resolve(__dirname, '../contract_filesystem/')+path.sep,

  /**
   * Path to API modules.
   */
  apisPath: path.resolve(__dirname, '../apis/')+path.sep,

  /**
   * Path to runtime library modules.
   */
  runtimeLibraryPath: path.resolve(__dirname, '../runtime_library/')+path.sep,

  /**
   * Api modules that the engine should load and have available.
   */
  apis: [
    'fs',
    'secrets'
  ],

  /**
   * Apis to be added to automatically generated manifests.
   */
  defaultManifestApis: [
    'fs',
    'secrets'
  ],

  /**
   * Name for the manifest file.
   *
   * The manifest file specifies the basic properties of the contract.
   */
  manifestFilename: 'codius-manifest.json',

  /**
   * Default filenames for primary contract script.
   *
   * When generating an implicit manifest, the contract engine will look for
   * these filenames as the entry point.
   */
  defaultMainFilenames: [
    'contract.js',
    'main.js',
    'index.js'
  ],

  /**
   * Where to log to.
   *
   * Should be an object with methods such as "info", "warn", "error".
   */
  logger: console,

  /**
   *  Stream where the sandbox stdout should go.
   */
  outputStream: process.stdout

};

exports.Config = Config;
