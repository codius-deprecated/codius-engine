exports.init = function (engine, config) {
  engine.registerAPI('response', function(runner, data){
    return new Response(runner);
  });
};

/**
 * Ability to control HTTP response.
 */
function Response(runner) {
  var self = this;

  self._runner = runner;
}

Response.prototype.write = function(params) {
  var self = this;

  if (!self._runner.res) {
    throw new Error('Not running in an HTTP server context.');
  }

  self._runner.res.write(params.data);
};


Response.prototype.end = function() {
  var self = this;

  if (!self._runner.res) {
    throw new Error('Not running in an HTTP server context.');
  }

  self._runner.res.end();
};
