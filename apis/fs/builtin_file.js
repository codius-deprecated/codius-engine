var util = require('util');
var path = require('path');

var AbstractFile = require('./abstract_file').AbstractFile;

var BuiltinFile = function (path) {
  AbstractFile.apply(this);

  this._path = path;
};

util.inherits(BuiltinFile, AbstractFile);

BuiltinFile.prototype.getRealPath = function () {
  return this._path;
};

exports.BuiltinFile = BuiltinFile;
