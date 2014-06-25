var fs            = require('fs');
var Sandbox       = require('sandbox');
var ApiHandler    = require('./lib/api-handler');

// Load API Modules (trusted)
var foo_manifest  = require('./api_modules/foo/manifest.json');
var foo_module    = require('./api_modules/foo');
var fs_manifest   = require('./api_modules/fs/manifest.json');
var fs_module     = require('./api_modules/fs');

// Load Contract Code (untrusted)
var test_manifest = require('./test-manifest.json');
var test_contract = fs.readFileSync('./test-contract.js', { encoding: 'utf8' });

// Load Contract Libraries (untrusted)
var callback_handler = fs.readFileSync('./contract_libraries/callback-handler.js', { encoding: 'utf8' });

function runContract(manifest, code, callback) {

  var apihandler = new ApiHandler();

  // Register Contract Files
  var contract_files = manifest.files;
  var contract_filesystem = new fs_module(contract_files);

  // Register APIs
  // TODO: do this based on the contract's manifest
  apihandler.registerApi(foo_manifest, foo_module);
  apihandler.registerApi(fs_manifest, contract_filesystem);

  // Load Contract Libraries
  // TODO: do this based on the manifest
  code = callback_handler + ';' + code;

  // Create sandbox and run contract
  var sandbox = new Sandbox();

  // Setup message listener to handle calls from within the sandbox
  // Note that messages must be sent as strings!
  sandbox.on('message', function(message_string){

    var message;
    try {
      message = JSON.parse(String(message_string));
    } catch(error) {
      throw new Error('Invalid message: ' + String(message_string))
    }

    console.log('got message: ', message);

    var parameters = {
      module: message.module,
      method: message.method,
      data: message.data
    };
    var contract_callback = function(error, result) {
      console.log('contract_callback got error:', error, 'result:', result);
      sandbox.postMessage(JSON.stringify({
        type: 'callback',
        callback: message.callback,
        error: error,
        result: result
      }));
    };

    apihandler.callApi(parameters, contract_callback);
  });

  sandbox.run(code, callback);

}

runContract(test_manifest, test_contract, function(error, result){
  console.log('final runContract error:', error, 'result:', result);
});
