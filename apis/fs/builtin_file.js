var util = require('util');
var path = require('path');

var AbstractFile = require('./abstract_file').AbstractFile;

var VirtualFile = function (path) {
  AbstractFile.apply(this);

  this._path = path;
};

util.inherits(VirtualFile, AbstractFile);

VirtualFile.prototype.getRealPath = function () {
  return this._path;
};

exports.VirtualFile = VirtualFile;
