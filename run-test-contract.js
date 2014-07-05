var fs = require('fs');
var async    = require('async');
var crypto   = require('crypto');
var Config   = require('./lib/config').Config;
var Engine   = require('./lib/engine').Engine;
var Compiler = require('./lib/compiler').Compiler;
var FileManager = require('./lib/filemanager').FileManager;

var CONTRACT_DIR = __dirname + '/test_contract/';
var FILESYSTEM_DIR = __dirname + '/contract_filesystem/';

var config = new Config();
config.contractsFilesystemPath = FILESYSTEM_DIR;

var compiler = new Compiler(config);
var fileManager = new FileManager(config);

compiler.on('file', function (event) {
  fileManager.storeFileWithHash(event.hash, event.data);
});

var contract_hash = compiler.compileModule(CONTRACT_DIR);

/**
 *  Create a new Engine and run the test contract
 */
var engine = new Engine(config);
console.log('Run contract: ' + contract_hash);
engine.runContract(contract_hash, function(error, result){
  console.log('final error:', error, 'result:', result);
});
