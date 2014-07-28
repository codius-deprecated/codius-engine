var path = require('path');
var fs = require('fs');

var FileHash = require('./filehash').FileHash;

var FileManager = function (config) {
  this.config = config;
};

/**
 * Hash file data and store file in contracts filesystem.
 */
FileManager.prototype.storeFileData = function (data) {
  var hash = FileHash.hash(data);
  this._storeFile(hash, data);
};

/**
 * Write the given file to the filesystem using the given filename (should
 * be the hash if the file.)
 */
FileManager.prototype.storeFileWithHash = function (hash, file) {
  var file_path = path.join(this.config.contracts_filesystem_path, hash);
  if (!fs.existsSync(file_path)) {
    fs.writeFileSync(file_path, file);
  }
};

exports.FileManager = FileManager;
