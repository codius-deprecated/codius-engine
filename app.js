var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var Engine = require('./engine');

var CONTRACT_DIR = __dirname + '/test_contract/';
var FILESYSTEM_DIR = __dirname + '/contract_filesystem/';

/**
 *  Load hash all contract files and resave them into the
 *  contract_filesystem.
 *
 *  Note that this is only for testing purposes and this
 *  functionality will be handled by the contract host in the future.
 */
var test_contract_files = fs.readdirSync(CONTRACT_DIR);
if (!fs.existsSync(FILESYSTEM_DIR)) {
  fs.mkdirSync(FILESYSTEM_DIR);
}
var test_contract_manifest_hash;

async.eachSeries(test_contract_files, function(filename, async_callback){

  var fd = fs.createReadStream(CONTRACT_DIR + filename);
  var hash = crypto.createHash('sha512');
  hash.setEncoding('hex');

  fd.on('end', function() {
      hash.end();
      var file_hash = hash.read().slice(0,64);

      if (filename.indexOf('manifest') !== -1) {
        test_contract_manifest_hash = file_hash;
      }

      var new_file = fs.createWriteStream(FILESYSTEM_DIR + file_hash);
      fd = fs.createReadStream(CONTRACT_DIR + filename);

      fd.pipe(new_file);

      fd.on('end', async_callback);
  });

  // read all file and pipe it (write it) to the hash object
  fd.pipe(hash);

}, function(error){
  if (error) {
    throw error;
  }


  /**
   *  Create a new Engine and run the test contract
   */
  var engine = new Engine();
  engine.runContract(test_contract_manifest_hash, function(error, result){
    console.log('final error:', error, 'result:', result);
  });
});
