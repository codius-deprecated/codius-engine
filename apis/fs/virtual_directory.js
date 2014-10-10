var util = require('util');

var AbstractDirectory = require('./abstract_directory').AbstractDirectory;

var VirtualDirectory = function (subNodes) {
  AbstractDirectory.apply(this);

  if (!Array.isArray(subNodes)) {
    throw new Error('Subnodes must be an array!');
  }

  this._subNodes = subNodes;
};

util.inherits(VirtualDirectory, AbstractDirectory);

VirtualDirectory.prototype.readdir = function (callback) {
  callback(null, this._subNodes);
};

exports.VirtualDirectory = VirtualDirectory;
