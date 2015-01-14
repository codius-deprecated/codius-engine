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
 *
 * Files are stored such that the file "fdf9402e5a083a30430769dcf291018b1bed2a40a08f8e9915c5b14ea34668be"
 * would be found in the contract filesystem at fd/f9/fdf9402e5a083a30430769dcf291018b1bed2a40a08f8e9915c5b14ea34668be
 */
FileManager.prototype.storeFileWithHash = function (hash, file) {
  var self = this;

  var firstDir = hash.slice(0, 2);
  var secondDir = hash.slice(2, 4);

  var filePath = path.join(self.config.contractsFilesystemPath, firstDir, secondDir, hash);
  
  // Ensure that the contractsFilesystem dir exists
  return self._ensureDir(self.config.contractsFilesystemPath)
    .then(function(){
      // Ensure that firstDir exists
      return self._ensureDir(path.join(self.config.contractsFilesystemPath, firstDir));
    })
    .then(function(){
      // Ensure that secondDir exists
      return self._ensureDir(path.join(self.config.contractsFilesystemPath, firstDir, secondDir));
    })
    .then(function () {
      // Check if the file already exists
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
