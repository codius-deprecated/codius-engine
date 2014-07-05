var path = require('path');
var extend = require('extend');

function Config() {
  extend(this, Config.defaults);
}

Config.defaults = {
  contractsFilesystemPath: path.resolve(__dirname, '../contract_filesystem/')+path.sep,
  apisPath: path.resolve(__dirname, '../apis/')+path.sep,

  /**
   * Apis to be added to automatically generated manifests.
   */
  defaultManifestApis: [
    'fs',
    'foo'
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
  ]
};

exports.Config = Config;
