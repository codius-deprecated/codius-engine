var fs = require('fs');

/**
 *  When this file is required it concatenates all of the
 *  other files in this directory into a single string
 *  that can be prepended to the contract code to be run
 *  inside of the sandbox.
 */
var components = [
  'callback-handler.js',
  'module.js',
  'secrets.js'
];
var runtime_library = ';';
components.forEach(function(component_filename){
  if (__dirname + '/' + component_filename !== __filename) {
    var component_contents = fs.readFileSync(__dirname + '/' + component_filename, {
      encoding: 'utf8'
    });
    runtime_library += component_contents + ';';
  }
});

module.exports = runtime_library;
