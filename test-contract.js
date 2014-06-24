console.log('contract running');

var message = {
  module: 'foo',
  method: 'foo',
  data: 'my bar'
};

console.log('sandboxed code posting message: ' + JSON.stringify(message));
postMessage(message, foo_handler);

function foo_handler (error, result) {
  console.log('in sandboxed code foo_handler got error: ' + error + ' result: ' + result);
  process.exit();
}
