(function(context){
  'use strict';

  // This regex is from the Node.js source code:
  // https://github.com/joyent/node/blob/b9bec2031e5f44f47cf01c3ec466ab8cddfa94f6/lib/path.js#L308-L311
  var PATH_SPLITTER_REGEX = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

  // Remove superfluous "./"'s from the middle of the path
  var DOT_SLASH_REMOVER_REGEX = /^(?:\.\/|)(?:[\s\S]*?)(?:[^\.])(\.\/)/;

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

    module_identifier = normalizePath(module_identifier);

    var file = __readFileSync(module_identifier);

    if (extension === '.js') {
      return loadJavascript(module_identifier, file);
    } else if (extension === '.json') {
      return loadJson(module_identifier, file);
    }

  };

  /**
   *  Eval the module_code to extract the module.exports.
   *  Note that within the eval context, require will be overwritten
   *  with a version that prepends the path of the current module_identifier
   *  (or its directory if module_identifier refers to a file) so that
   *  when require is called in submodules it will work as expected.
   *
   *  @param {String} module_identifier
   *  @param {String} module_code
   *
   *  @returns {type depends on module} exports The module.exports or exports set by running the module_code
   */
  function loadJavascript(module_identifier, module_code) {
    var module = { exports: {} };
    var exports;

    // Split the path to extract the dir name from this module_identifier
    // If the module_identifier has no extension, assume it is a module
    // so the basename should be included in the path
    var path_split = splitPath(module_identifier);
    var dir_for_submodules = path_split.dir;
    if (path_split.basename && !path_split.ext) {
      dir_for_submodules += path_split.basename + '/';
    }

    try {

      // Overwrite the require that will be used by submodules
      // with a version that prepends this module's module_identifier
      // and "/codius_modules/" to the submodule's require string
      var overwrite_require = '(function(){' +
        'var original_require = require; ' +
        'require = function(id){ ' +
          'var append_string = "' + dir_for_submodules + '";' +
          'if (!/^(\\.\\/|\\/)/.test(id)) { ' +
            'append_string += "codius_modules/";' +
          '}' +
          'return original_require(append_string + id);' +
        '}' +
      '})()';

      // eval the module code to extract the module.exports section
      // TODO: should the module code be eval'ed in strict mode?
      eval('(function(module, exports, require){' + overwrite_require + ';' + module_code + ';})(module, module.exports, require);');
    } catch(error) {
      throw new Error('Error requiring module: "' + module_identifier + '" ' + error);
    }

    exports = module.exports || module;

    return exports;
  }

  /**
   *  Parse the module_code as JSON
   *
   *  @param {String} module_identifier
   *  @param {String} module_code
   *
   *  @returns {Object} json
   */
  function loadJson(module_identifier, module_code) {
    var json;

    try {
      json = JSON.parse(module_code);
    } catch(error) {
      throw new Error('Error parsing JSON file: "' + module_identifier + '" ' + error);
    }

    return json;
  }

  // Split path into its root, dir, basename, and file extension
  function splitPath(path) {
    var results = PATH_SPLITTER_REGEX.exec(path);
    return {
      root: results[1],
      dir: results[2],
      basename: results[3],
      ext: results[4]
    };
  }

  // The following function is taked from:
  // https://github.com/joyent/node/blob/b9bec2031e5f44f47cf01c3ec466ab8cddfa94f6/lib/path.js#L347-L376
  function normalizePath(path) {
    var isAbsolute = path.charAt(0) === '/',
        trailingSlash = path[path.length - 1] === '/',
        segments = path.split('/'),
        nonEmptySegments = [];

    // Normalize the path
    for (var i = 0; i < segments.length; i++) {
      if (segments[i]) {
        nonEmptySegments.push(segments[i]);
      }
    }
    path = normalizeArray(nonEmptySegments, !isAbsolute).join('/');

    if (!path && !isAbsolute) {
      path = '.';
    }
    if (path && trailingSlash) {
      path += '/';
    }

    return (isAbsolute ? '/' : '') + path;
  }

  // The following function is from:
  // https://github.com/joyent/node/blob/b9bec2031e5f44f47cf01c3ec466ab8cddfa94f6/lib/path.js#L27-L55
  //
  // resolves . and .. elements in a path array with directory names there
  // must be no slashes, empty elements, or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (; up--; up) {
        parts.unshift('..');
      }
    }

    return parts;
  }

})(this);
