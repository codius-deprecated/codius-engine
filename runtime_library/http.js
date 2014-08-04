(function(context){
  'use strict';

  // Run the module code in a closure to extract the exports
  var module = { exports: {} };
  (function(module, exports) {

  })(module, module.exports);

  // Overwrite require for input module (because it does not request an external file)
  var old_require = context.require;
  context.require = function(module_identifier) {
    if (module_identifier === 'http') {
      return module.exports;
    } else {
      return old_require(module_identifier);
    }
  };
})(this);
