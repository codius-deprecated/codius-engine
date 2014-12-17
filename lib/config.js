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
   * Enable valgrind for debugging
   */
  enableValgrind: false,

  /**
   * Use Native Client sandbox
   */
  disableNacl: false

};

exports.Config = Config;
