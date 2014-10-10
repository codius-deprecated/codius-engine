var util = require('util');

var AbstractFilesystemNode = require('./abstract_filesystem_node').AbstractFilesystemNode;

var AbstractDirectory = function () {
  AbstractFilesystemNode.apply(this);
};

util.inherits(AbstractDirectory, AbstractFilesystemNode);

// We don't really care about any of the stat properties of the virtual
// directories, so we just return something realistic.
// TODO Could be more realistic.
AbstractDirectory.STAT_FOR_DIRECTORIES = {
  dev: 2049,
  mode: 16893,
  nlink: 5,
  uid: 1000,
  gid: 1000,
  rdev: 0,
  blksize: 4096,
  ino: 6695080,
  size: 4096,
  blocks: 8,
  atime: 'Tue Oct 07 2014 11:02:22 GMT-0700 (PDT)',
  mtime: 'Tue Oct 07 2014 10:54:18 GMT-0700 (PDT)',
  ctime: 'Tue Oct 07 2014 10:54:18 GMT-0700 (PDT)'
};

AbstractDirectory.prototype.isDirectory = function () {
  return true;
};

AbstractDirectory.prototype.stat =
AbstractDirectory.prototype.lstat = function (callback) {
  callback(null, AbstractDirectory.STAT_FOR_DIRECTORIES);
};

exports.AbstractDirectory = AbstractDirectory;
