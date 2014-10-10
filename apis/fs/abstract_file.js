var util = require('util');
var fs = require('fs');

var AbstractFilesystemNode = require('./abstract_filesystem_node').AbstractFilesystemNode;

var AbstractFile = function () {
  AbstractFilesystemNode.apply(this);
};

util.inherits(AbstractFile, AbstractFilesystemNode);

AbstractFile.prototype.stat = function (callback) {
  fs.stat(this.getRealPath(), callback);
};

AbstractFile.prototype.lstat = function (callback) {
  fs.lstat(this.getRealPath(), callback);
};

exports.AbstractFile = AbstractFile;
