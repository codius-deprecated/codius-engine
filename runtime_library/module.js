(function(context){
  'use strict';

  // This regex is from the Node.js source code:
  // https://github.com/joyent/node/blob/b9bec2031e5f44f47cf01c3ec466ab8cddfa94f6/lib/path.js#L308-L311
  var PATH_SPLITTER_REGEX = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

  // This regex captures `module_name` ONLY:
  // module_name
  // codius_modules/module_name
  // codius_modules/module_name/not_captured_thing
  // ./codius_modules/module_name

  // TODO: this regex is not working properly!
  var CODIUS_MODULE_REGEX = /(?!^\.)(?:^|(?:(?:\.\/)?codius_modules\/))(?!codius_modules)((?:\\\/|[^\/])+)/i;

  // This regex is used to replace unnecessary './' and '/' within paths
  var EXTRA_DOTS_SLASHES_REGEX = /(\/\.\/|\/\/)/g;

  var DOT_DOT_FROM_MODULE_REGEX = /(codius_modules\/(?:\\\/|[^\/])+\/\.\.\/)/gi;

  // These are the filenames require will look for within modules
  var MODULE_MANIFEST_FILES = ['codius-manifest.json', 'manifest.json', 'package.json'];

  // These are the filenames that will be inferred if a directory is required ('some_directory' -> 'some_directory/index.js')
  var INFERRED_DIRECTORY_FILES = ['index.js'];

  // File extensions that can be inferred if none is explicitly declared
  var INFERRED_FILE_EXTENSIONS = ['.js'];

  /**
   *  Load a module or javascript or JSON file based on its module_identifier
   *  and return the results.
   *
   *  If the module_identifier has no extension or a ".js" extension
   *  it will be eval'ed and its module.exports will be returned.
   *  If the module_identifier ends in ".json" the file will be parsed as JSON.
   *  Otherwise, it will throw an error.
   *
   *  @param {String} path
   *
   *  @returns {Object|String} result Type depends on path
   */
  context.require = function(path) {
    var file;
    var extension;

    path = expandCodiusModules(path);

    // If the path does not end with an extension, check if it
    // is a module or a file without an extension listed
    extension = splitPath(path).ext.toLowerCase();
    if (!extension) {

      path = tryModule(path) || tryFile(path) || tryDirectory(path) || path;

      extension = splitPath(path).ext.toLowerCase();
    }

    file = __readFileSync(cleanPath(path));

    if (extension === '.js') {
      return loadJavascript(path, file);
    } else if (extension === '.json') {
      return loadJson(path, file);
    } else {
      throw new Error('require can only be used to load modules, javascript files, and JSON files');
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

    try {
      // Overwrite the require that will be used by submodules

      // dir_for_submodules is the directory the current file is in
      // However, if a submodule requires a module we must look for it in
      // the manifest of that submodule, which is what we use the last_module_path for
      // (e.g. if `codius_modules/module/lib/index.js` requires `submodule`, we need to
      // look for it in `codius_modules/module/codius-manifest.json`, NOT in `codius_modules/module/lib/codius-manifest.json`)
      var dir_for_submodules = splitPath(module_identifier).dir;
      var last_module_path = truncateToLastInstance(dir_for_submodules, CODIUS_MODULE_REGEX);

      var overwrite_require = '(function(){' +
        'var original_require = require; ' +
        'var full_id = ""; ' +
        'require = function(id){ ' +
          'if (id.search(' + CODIUS_MODULE_REGEX +') === 0) { ' +
            'full_id = "' + last_module_path + '" + "/codius_modules/" + ' + CODIUS_MODULE_REGEX + '.exec(id)[1] + id.replace(' + CODIUS_MODULE_REGEX + ', ""); ' +
          '} else { ' +
            'full_id = "' + dir_for_submodules + '" + id; ' +
          '}' +
          'return original_require(full_id);' +
        '}' +
      '})()';

      // eval the module code to extract the module.exports section
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

  /**
   *
   *  HELPER FUNCTIONS
   *
   */

  // Normalize a path and remove extra './' and '/'
  function cleanPath(path) {
    // Special case: 'codius_modules/a/codius_modules/b/../file.js' -> 'codius_modules/a/file.js'
    var cleaned = path.replace(DOT_DOT_FROM_MODULE_REGEX, '');

    // Use Node.js's normalizePath to further clean up the path
    cleaned = normalizePath(cleaned);

    // Remove extra './' and '/' from the path
    cleaned = cleaned.replace(EXTRA_DOTS_SLASHES_REGEX, '/');

    return cleaned;
  }

  // Try loading all of the possible MODULE_MANIFEST_FILES looking for a 'main' to add to the path
  function tryModule(path) {
    for (var m = 0; m < MODULE_MANIFEST_FILES.length; m++) {
      try {
        var manifest_string = __readFileSync(cleanPath(path + '/' + MODULE_MANIFEST_FILES[m]));
        if (typeof manifest_string === 'string') {
          var manifest = JSON.parse(manifest_string);
          var main_path = cleanPath(path + '/' + manifest.main);
          if (typeof __readFileSync(main_path) === 'string') {
            return main_path;            
          }
        }
      } catch(error) {
        continue;
      }
    }

    // Look for the module higher up in the tree as well
    var target = splitPath(path).basename;
    var path_one_level_up = truncateToSecondToLastInstance(path, CODIUS_MODULE_REGEX);
    if (target && path_one_level_up && path_one_level_up !== path) {
      var module_name = splitPath(path_one_level_up).basename;
      var path_without_module_name = path_one_level_up.slice(0, path_one_level_up.length - (module_name.length + 1));
      return tryModule(path_without_module_name + '/' + target);
    }

    return null;
  }

  // Try the INFERRED_DIRECTORY_FILES to see if the path refers to a directory
  function tryDirectory(path) {
    for (var f = 0; f < INFERRED_DIRECTORY_FILES.length; f++) {
      try {
        var file_path = cleanPath(path + '/' + INFERRED_DIRECTORY_FILES[f]);
        var file_string = __readFileSync(file_path);
        if (typeof file_string === 'string') {
          return file_path;
        }
      } catch(error) {
        continue;
      }
    }
    return null;
  }

  // Try each of the INFERRED_FILE_EXTENSIONS to see if they are actual files
  function tryFile(path) {
    for (var f = 0; f < INFERRED_FILE_EXTENSIONS.length; f++) {
      try {
        var file_path = cleanPath(path + INFERRED_FILE_EXTENSIONS[f]);
        var file_string = __readFileSync(file_path);
        if (typeof file_string === 'string') {
          return file_path;
        }
      } catch(error) {
        continue;
      }
    }
    return null;
  }

  // Expand `module_name/other_stuff` to `codius_modules/module_name/other_stuff`
  function expandCodiusModules(path) {
    if (path.search(CODIUS_MODULE_REGEX) === 0) {
      var module_name = CODIUS_MODULE_REGEX.exec(path)[1];
      var rest_of_path = path.replace(CODIUS_MODULE_REGEX, '');
      path = 'codius_modules/' + module_name;
      if (rest_of_path && rest_of_path[0] !== '/') {
        path += '/';
      }
      if (rest_of_path) {
        path += rest_of_path;
      }
    }
    return path;
  }

  // Slice the given string to the last instance of the regex (inclusive)
  function truncateToLastInstance(string, regex) {
    var regex = new RegExp(regex.source, 'ig');
    var exec_result = execToLastInstance(string, regex);
    if (!exec_result) {
      return string;
    }
    var end_index_of_last_instance = string.lastIndexOf(exec_result[1]) + exec_result[1].length;
    var to_last_result = string.slice(0, end_index_of_last_instance);
    return to_last_result;
  }

  // Slice the given string to the second to last instance of the regex (inclusive)
  function truncateToSecondToLastInstance(string, regex) {
    var regex = new RegExp(regex.source, 'ig');
    var exec_result = execToLastInstance(string, regex);
    if (!exec_result) {
      return string;
    }
    var start_index_of_last_instance = exec_result.index;
    return truncateToLastInstance(string.slice(0, start_index_of_last_instance), regex);
  }

  // Keep applying the regex to the string to find the last instance of it
  function execToLastInstance(string, regex) {
    var prev;
    var result;
    while((result = regex.exec(string)) !== null) {
      prev = result;
    }
    return prev;
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
