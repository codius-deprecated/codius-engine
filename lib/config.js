var path   = require('path');
var extend = require('extend');
var nconf  = require('nconf');

nconf.argv()
     .env()
     .file({ file: path.resolve(__dirname, '..', 'config.json') })

nconf.defaults({
  /**
   * Path where the virtual contracts filesystem lives on the physical disk.
   */
  contracts_filesystem_path: path.resolve(__dirname, '../contract_filesystem/')+path.sep,

  /**
   * Path to API modules.
   */
  apis_path: path.resolve(__dirname, '../apis/')+path.sep,

  /**
   * Api modules that the engine should load and have available.
   */
  apis: [
    'fs',
    'foo'
  ],

  /**
   * Apis to be added to automatically generated manifests.
   */
  default_manifest_apis: [
    'fs',
    'foo'
  ],

  /**
   * Name for the manifest file.
   *
   * The manifest file specifies the basic properties of the contract.
   */
  manifest_filename: 'codius-manifest.json',

  /**
   * Default filenames for primary contract script.
   *
   * When generating an implicit manifest, the contract engine will look for
   * these filenames as the entry point.
   */
  default_main_filenames: [
    'contract.js',
    'main.js',
    'index.js'
  ]
});

function Config(opts) {
  extend(this, nconf.get());
  extend(this, opts);
}

exports.Config = Config;
