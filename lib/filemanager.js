var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var path = require('path');

var FileHash = require('./filehash').FileHash;

var FileManager = function (config) {
  this.config = config;
};

/**
 * Hash file data and store file in contracts filesystem.
 */
FileManager.prototype.storeFileData = function (data) {
  var hash = FileHash.hash(data);
  return this.storeFileWithHash(hash, data);
};

/**
 * Write the given file to the filesystem using the given filename (should
 * be the hash if the file.)
 */
FileManager.prototype.storeFileWithHash = function (hash, file) {
  var filePath = path.join(this.config.contractsFilesystemPath, hash);
  return this._ensureDir(this.config.contractsFilesystemPath)
    .then(function () {
      return fs.statAsync(filePath);
    })
    .catch(Promise.OperationalError, function (err) {
      // If file does not exist
      if (err.cause.code === 'ENOENT') {
        return fs.writeFileAsync(filePath, file);
      }
    }).return(true);
};

/**
 * Ensure a directory exists, otherwise create it.
 *
 * This will ensure a directory exists, if it doesn't it will create it
 * including any parent directories that are needed to create that path.
 */
FileManager.prototype._ensureDir = function (dir, mode, callback) {
  var self = this;

  return fs.statAsync(dir).catch(Promise.OperationalError, function (err) {
    if (err.cause.code === 'ENOENT') {
      var current = path.resolve(dir), parent = path.dirname(current);

      return self._ensureDir(parent, mode).then(function () {
        return fs.mkdirAsync(current, mode);
      }).catch(function (err) {
        if (err.code !== 'EEXIST') return;
        else throw err;
      });
    }
  }).return(true);
}

exports.FileManager = FileManager;
