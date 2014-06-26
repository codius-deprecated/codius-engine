var fs              = require('fs');
var Sandbox         = require('sandbox');
var ApiHandler      = require('./api-handler');
var runtime_library = require('../runtime_library');

var FILESYSTEM_DIR = __dirname + '/../contract_filesystem/';

/**
 *  Class to run contracts.
 *
 *  @param {Object} data.manifest
 *  @param {Object} data.apis
 */
function ContractRunner(data) {
  var self = this;

  self._manifest = data.manifest;

  // setup sandbox instance
  self._sandbox  = new Sandbox();

  // setup API Handler based on manifest
  self._api_handler = new ApiHandler(data);
  // TODO: setup API Handler based on manifest

  // TODO: setup virtual filesystem
}

ContractRunner.prototype.run = function(data, callback) {
  var self = this;

  var message_handler = self._api_handler.handleMessage.bind(self._api_handler, self._sandbox);
  self._sandbox.on('message', message_handler);

  console.log(self._api_handler);

  // TODO: use data

  // Load main file
  var main_file_hash = self._manifest.files[self._manifest.main];
  var main_file_path = FILESYSTEM_DIR + main_file_hash;
  var main = fs.readFileSync(main_file_path, { encoding: 'utf8' });

  // Concatenate the runtime library to the main file
  var code_to_run = runtime_library + ';' + main;

  self._sandbox.run(code_to_run, function(error, result){

    // Remove message listener
    self._sandbox.removeListener('message', message_handler);

    if (typeof callback === 'function') {
      callback(error, result);
    }
  });
};

module.exports = ContractRunner;
