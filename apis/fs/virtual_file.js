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
	var self = this;

	var firstDir = self._hash.slice(0, 2);
	var secondDir = self._hash.slice(2, 4);

  return path.join(this._contractFilesystemPath, firstDir, secondDir, this._hash);
};

exports.VirtualFile = VirtualFile;
