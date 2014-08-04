(function(context){
  'use strict';

  // Run the module code in a closure to extract the exports
  var module = { exports: {} };
  (function(module, exports) {
    exports.isatty = function () { return false; };

    function ReadStream() {
      throw new Error('tty.ReadStream is not implemented');
    }
    exports.ReadStream = ReadStream;

    function WriteStream() {
      throw new Error('tty.ReadStream is not implemented');
    }
    exports.WriteStream = WriteStream;
  })(module, module.exports);

  // Overwrite require for input module (because it does not request an external file)
  var old_require = context.require;
  context.require = function(module_identifier) {
    if (module_identifier === 'tty') {
      return module.exports;
    } else {
      return old_require(module_identifier);
    }
  };
})(this);
