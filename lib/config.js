var path = require('path');
var extend = require('extend');

function Config(opts) {
  extend(this, Config.defaults);
  extend(this, opts);
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

Config.defaults = {
  /**
   * Path where the virtual contracts filesystem lives on the physical disk.
   */
  contractsFilesystemPath: path.resolve(getUserHome() || (__dirname+'/..'), '.codius/contract_filesystem/')+path.sep,

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
    'secrets',
    'dns',
    'net',
    'crypto',
    'localstorage',
    'time'
  ],

  /**
   * Apis to be added to automatically generated manifests.
   */
  defaultManifestApis: [
    'fs',
    'secrets',
    'dns',
    'net',
    'crypto',
    'localstorage',
    'time'
  ],

  /**
   * Name for the manifest file.
   *
   * The manifest file specifies the basic properties of the contract.
   */
  manifestFilename: 'codius-manifest.json',

  /**
   * Name for the config file.
   */
  configFilename: 'codius-config.json',

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
   * Filenames that specify filepath patterns to ignore
   */
  ignoreFiles: ['.codiusignore'],

  /**
   * The port that contracts should listen to inside the sandbox
   */
  virtual_port: 8000,

  /**
   * Where to log to.
   *
   * Should be an object with methods such as "info", "warn", "error".
   */
  logger: console,

  /**
   *  Stream where the sandbox stdout should go.
   */
  outputStream: process.stdout,

  /**
   * Enable debugging with GDB
   */
  enableGdb: false,

  /**
   * Use the codius-node-sandbox/codius-lang-js Native Client sandbox
   */
  // TODO Remove when ending support for old sandbox
  legacySandbox: false,

  /**
   * Enable valgrind for debugging
   */
  // TODO Remove when ending support for old sandbox
  enableValgrind: false,

  /**
   * Use Native Client sandbox
   */
  // TODO Remove when ending support for old sandbox
  disableNacl: false

};

exports.Config = Config;
