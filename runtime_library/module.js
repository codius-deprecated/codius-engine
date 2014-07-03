(function(context){
  'use strict';

  // This regex is from the Node.js source code:
  // https://github.com/joyent/node/blob/b9bec2031e5f44f47cf01c3ec466ab8cddfa94f6/lib/path.js#L308-L311
  var PATH_SPLITTER_REGEX = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/i;

  /**
   *  Load a module or javascript or JSON file based on its module_identifier
   *  and return the results.
   *
   *  If the module_identifier has no extension or a ".js" extension
   *  it will be eval'ed and its module.exports will be returned.
   *  If the module_identifier ends in ".json" the file will be parsed as JSON.
   *  Otherwise, it will throw an error.
   *
   *  @param {String} module_identifier
   *
   *  @returns {Object|String} result Type depends on module_identifier
   */
  context.require = function(module_identifier) {

    var extension = (splitPath(module_identifier).ext || '.js').toLowerCase();

    if (extension !== '.js' && extension !== '.json') {
      throw new Error('require can only be used to load modules, javascript files, and JSON files');
    }

    var file = __readFileSync(module_identifier);

    if (extension === '.js') {
      return loadJavascript(module_identifier, file);
    } else if (extension === '.json') {
      return loadJson(module_identifier, file);
    }

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

  function loadJavascript(module_identifier, module_code) {
    var module = {};
    var exports;

    try {

      // Overwrite the require that will be used by submodules
      // with a version that prepends this module's module_identifier
      // and "/contract_modules/" to the submodule's require string
      var overwrite_require = '(function(){' +
        'var original_require = require; ' +
        'require = function(id){ ' +
          'var append_string = "' + module_identifier + '/";' +
          'if (!/^(\\.\\/|\\/)/.test(id)) { ' +
            'append_string += "contract_modules/";' +
          '}' +
          'return original_require(append_string + id);' +
        '}' +
      '})()';

      // eval the module code to extract the module.exports section
      // TODO: should the module code be eval'ed in strict mode?
      eval('(function(module, exports, require){' + overwrite_require + ';' + module_code + '})(module, module, require);');
    } catch(error) {
      throw new Error('Error requiring module: "' + module_identifier + '" ' + error);
    }

    exports = module.exports || module;

    return exports;
  }

  function loadJson(module_identifier, module_code) {
    var json;

    try {
      json = JSON.parse(module_code);
    } catch(error) {
      throw new Error('Error parsing JSON file: "' + module_identifier + '" ' + error);
    }

    return json;
  }

})(this);
