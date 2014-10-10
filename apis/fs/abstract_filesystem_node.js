var AbstractFilesystemNode = function () {

};

AbstractFilesystemNode.prototype.isDirectory = function () {
  return false;
};

exports.AbstractFilesystemNode = AbstractFilesystemNode;
