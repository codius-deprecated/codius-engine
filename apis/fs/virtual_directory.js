var util = require('util');

var AbstractDirectory = require('./abstract_directory').AbstractDirectory;

var VirtualDirectory = function (subNodes) {
  AbstractDirectory.apply(this);

  if (!Array.isArray(subNodes)) {
    throw new Error('Subnodes must be an array!');
  }

  this._subNodes = subNodes;
  this._pos = 0;
};

util.inherits(VirtualDirectory, AbstractDirectory);

VirtualDirectory.prototype.readdir = function (callback) {
  callback(null, this._subNodes);
};

VirtualDirectory.prototype.getdents = function (callback) {
  this._pos += this._subNodes.length;
  callback (null, this._subNodes.slice(this._pos));
};

exports.VirtualDirectory = VirtualDirectory;
