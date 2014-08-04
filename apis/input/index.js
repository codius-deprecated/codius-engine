exports.init = function (engine, config) {
  engine.registerAPI('input', function(runner, data){
    var manifest = runner.getManifest();
    return new Input(data);
  });
};

// Provide access to the input data 
// provided when the contract is run
function Input(data) {
  var self = this;

  self._data = data;
}

Input.prototype.get = function(params, callback) {
  var self = this;
  
  callback(null, self._data);
};
