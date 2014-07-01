console.log('contract running');

postMessage({
  api: 'foo',
  method: 'foo',
  data: 'my bar'
}, function (error, result) {
  console.log('in sandboxed code foo_handler got error: ' + error + ' result: ' + result);
});

postMessage({
  api: 'fs',
  method: 'readFile',
  data: JSON.stringify({
    path: 'test-file.txt',
    options: {
      encoding: 'utf8'
    }
  })
}, function(error, result){
  console.log('readFile error: ' + error + ' result: ' + result);
});

var test_module = require('test_module');
console.log('test_module:' + JSON.stringify(test_module));
