(function(context){
  'use strict';

  function readFile(path, callback) {
    postMessage({
      api: 'fs',
      method: 'readFile',
      data: JSON.stringify({
        path: path,
        options: {
          encoding: 'utf8'
        }
      })
    }, callback);
  }

  context.require = function(module_name, callback) {

    if (typeof callback !== 'function') {
      throw new Error('require is asynchronous. Must provide a callback');
    }

    readFile(module_name, function(error, result){
      if (error) {
        callback(error);
        return;
      }

      var module = {};
      var exports;

      try {
        // eval the module code to extract the module.exports section
        eval('(function(module){"use strict";' + result + '})(module);');
      } catch(error) {
        callback(new Error('Error requiring module: ' + module_name + '. ' + error));
        return;
      }

      exports = module.exports || module;

      console.log('exports: ' + JSON.stringify(exports));

      callback(null, exports);

    });

  };

})(this);
