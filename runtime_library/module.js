(function(context){
  'use strict';

  // This regex is from the Node.js source code:
  // https://github.com/joyent/node/blob/b9bec2031e5f44f47cf01c3ec466ab8cddfa94f6/lib/path.js#L308-L311
  var PATH_SPLITTER_REGEX = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/i;

  /**
   *  Load a module or javascript or JSON file based on its module_identifier
   *  and pass the results to the callback. Note that the callback is
   *  mandatory because this version of require is asynchronous.
   *
   *  If the module_identifier has no extension or a ".js" extension
   *  it will be eval'ed and its module.exports will be passed to the callback.
   *  If the module_identifier ends in ".json" the file will be parsed as JSON.
   *  If the module_identifier does not meet either of the aforementioned
   *  conditions it will be passed to the callback without any additional parsing.
   *
   *  @param {String} module_identifier
   *  @param {Function} callback
   *
   *  @callback
   *  @param {Error} error
   *  @param {Object|String} result Type depends on module_identifier
   */
  context.require = function(module_identifier, callback) {

    if (typeof callback !== 'function') {
      throw new Error('require is asynchronous. Must provide a callback');
    }

    var extension = (splitPath(module_identifier).ext || '.js').toLowerCase();

    if (extension !== '.js' && extension !== '.json') {
      callback(new Error('require can only be used to load modules, javascript files, and JSON files'));
      return;
    }

    readFile(module_identifier, function(error, result){
      if (error) {
        callback(error);
        return;
      }

      if (extension === '.js') {
        loadJavascript(module_identifier, result, callback);
      } else if (extension === '.json') {
        loadJson(module_identifier, result, callback);
      }

    });

  };

  function splitPath(path) {
    var results = PATH_SPLITTER_REGEX.exec(path);
    return {
      root: results[1],
      dir: results[2],
      basename: results[3],
      ext: results[4]
    };
  }

  function readFile(path, callback) {
    context.postMessage({
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

  function loadJavascript(module_identifier, module_code, callback) {
    var module = {};
    var exports;

    try {
      // eval the module code to extract the module.exports section
      // TODO: should the module code be eval'ed in strict mode?
      eval('(function(module, exports){' + module_code + '})(module, module);');
    } catch(error) {
      callback(new Error('Error requiring module: ' + module_identifier + '. ' + error));
      return;
    }

    exports = module.exports || module;

    callback(null, exports);
  }

  function loadJson(module_identifier, module_code, callback) {
    var json;

    try {
      json = JSON.parse(module_code);
    } catch(error) {
      callback(new Error('Error parsing JSON file: ' + module_identifier + '. ' + error));
      return;
    }

    callback(null, json);
  }

})(this);
