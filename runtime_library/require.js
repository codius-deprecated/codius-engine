(function(context){
  'use strict';

  // module_identifiers can include any characters allowed by the filesystem
  // These regular expressions match JS and JSON file names to
  // determine how to parse the resulting file
  var FILEPATH_ESCAPED_CHARACTERS = '\\' + [ '/', '\\', '?', '%', '*', ':', '|', '"', '<', '>', ',', ';', '(', ')', '&', '#', '\s' ].join('\\');
  var ALLOWED_CHARACTERS = '[^' + FILEPATH_ESCAPED_CHARACTERS + ']|\\[' + FILEPATH_ESCAPED_CHARACTERS + ']';
  var JAVASCRIPT_FILE_STRING = '[//]?(' + ALLOWED_CHARACTERS + '+(?:\.js|\.JS)?)$';
  var JSON_FILE_STRING = '[//]?(' + ALLOWED_CHARACTERS + '+(?:\.json|\.JSON))$';
  var JAVASCRIPT_FILE_REGEX = new RegExp(JAVASCRIPT_FILE_STRING);
  var JSON_FILE_REGEX = new RegExp(JSON_FILE_STRING);

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

  /**
   *  Load a module or file based on its module_identifier and
   *  pass the results to the callback. Note that the callback is
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

    readFile(module_identifier, function(error, result){
      if (error) {
        callback(error);
        return;
      }

      if (JAVASCRIPT_FILE_REGEX.test(module_identifier)) {

        var module = {};
        var exports;

        try {
          // eval the module code to extract the module.exports section
          eval('(function(module){"use strict";' + result + '})(module);');
        } catch(error) {
          callback(new Error('Error requiring module: ' + module_identifier + '. ' + error));
          return;
        }

        exports = module.exports || module;

        // Add the module name to the exports object, as per
        // the CommonJS spec for require
        exports.id = module_identifier;

        callback(null, exports);

      } else if (JSON_FILE_REGEX.test(module_identifier)) {

        var json;

        try {
          json = JSON.parse(result);
        } catch(error) {
          callback(new Error('Error parsing JSON file: ' + module_identifier + '. ' + error));
          return;
        }

        callback(null, json);

      } else {

        // If the file is neither JS nor JSON, simply
        // call the callback with the raw result
        callback(null, result);

      }



    });

  };

})(this);
