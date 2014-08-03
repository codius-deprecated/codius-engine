(function(context){
  'use strict';

  // Overwrite require for fs module (because it does not request an external file)
  var old_require = context.require;
  context.require = function(module_identifier) {
    if (module_identifier === 'fs') {
      return new FileSystem();
    } else {
      return old_require(module_identifier);
    }
  };

  function FileSystem() {

  }

  FileSystem.prototype.readFile = function(path, options, callback) {
    postMessage({
      path: path,
      options: options
    }, callback);
  };

  FileSystem.prototype.readFileSync = function(path) {
    return __readFileSync(path);
  };

})(this);