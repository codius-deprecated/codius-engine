var util = require('util');
var path = require('path');

var AbstractFile = require('./abstract_file').AbstractFile;

var VirtualFile = function (hash, contractFilesystemPath) {
  AbstractFile.apply(this);

  this._hash = hash;
  this._contractFilesystemPath = contractFilesystemPath;
};

util.inherits(VirtualFile, AbstractFile);

VirtualFile.prototype.getRealPath = function () {
  return path.join(this._contractFilesystemPath, this._hash);
};

exports.VirtualFile = VirtualFile;
