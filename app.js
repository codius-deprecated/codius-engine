var fs = require('fs');
var recursive_read = require('fs-readdir-recursive');
var async = require('async');
var crypto = require('crypto');
var Engine = require('./engine');

var CONTRACT_DIR = __dirname + '/test_contract/';
var FILESYSTEM_DIR = __dirname + '/contract_filesystem/';

var test_contract_manifest_hash;

/**
 *  Load hash all contract files and resave them into the
 *  contract_filesystem.
 *
 *  Note that this is only for testing purposes and this
 *  functionality will be handled by the contract host in the future.
 */
function hashFilesIntoFileSystem(source, target, callback) {

  if (!fs.existsSync(FILESYSTEM_DIR)) {
    fs.mkdirSync(FILESYSTEM_DIR);
  }

  var test_contract_files = recursive_read(source);

  async.eachSeries(test_contract_files, function(filename, async_callback){

    var fd = fs.createReadStream(source + filename);
    var hash = crypto.createHash('sha512');
    hash.setEncoding('hex');

    fd.on('end', function() {
        hash.end();
        var file_hash = hash.read().slice(0,64);

        console.log(filename + ': ' + file_hash);

        if (filename.indexOf('test-manifest.json') !== -1) {
          test_contract_manifest_hash = file_hash;
        }

        var new_file = fs.createWriteStream(target + file_hash);
        fd = fs.createReadStream(source + filename);

        fd.pipe(new_file);

        fd.on('end', async_callback);
    });

    // read all file and pipe it (write it) to the hash object
    fd.pipe(hash);

  }, callback);

}


hashFilesIntoFileSystem(CONTRACT_DIR, FILESYSTEM_DIR, function(error){

  /**
   *  Create a new Engine and run the test contract
   */
  var engine = new Engine();
  console.log('Run contract: ' + test_contract_manifest_hash);
  engine.runContract(test_contract_manifest_hash, function(error, result){
    console.log('final error:', error, 'result:', result);
  });

});
