var Sandbox       = require('sandbox');
var ApiHandler    = require('./lib/api-handler');

var foo_manifest  = require('./api_modules/foo/manifest.json');
var foo_module    = require('./api_modules/foo');

var test_manifest = require('./test-manifest.json');
var test_contract = require('./test-contract');

function runContract(manifest, code, callback) {

  var apihandler = new ApiHandler();

  // Register APIs
  // TODO: do this based on the contract's manifest
  apihandler.registerApi(foo_manifest, foo_module);

  // Create sandbox and run contract
  var sandbox = new Sandbox();

  // Setup message listener to handle calls from within the sandbox
  sandbox.on('message', function(message){

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

runContract(test_manifest, '(' + test_contract.toString() + ')()', function(error, result){
  // console.log('error:', error, 'result:', result);
});
