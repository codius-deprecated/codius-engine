var fs = require('fs');
var async    = require('async');
var crypto   = require('crypto');
var Engine   = require('./engine');
var compile  = require('./compile-contract');

var CONTRACT_DIR = __dirname + '/test_contract/';
var FILESYSTEM_DIR = __dirname + '/contract_filesystem/';


var contract_hash = compile(CONTRACT_DIR, FILESYSTEM_DIR);

/**
 *  Create a new Engine and run the test contract
 */
var engine = new Engine();
console.log('Run contract: ' + contract_hash);
engine.runContract(contract_hash, function(error, result){
  console.log('final error:', error, 'result:', result);
});
