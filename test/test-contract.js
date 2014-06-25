console.log('contract running');

postMessage({
  module: 'foo',
  method: 'foo',
  data: 'my bar'
}, function (error, result) {
  console.log('in sandboxed code foo_handler got error: ' + error + ' result: ' + result);
});

postMessage({
  module: 'fs',
  method: 'readFile',
  data: JSON.stringify({
    filename: 'test-file.txt',
    options: {
      encoding: 'utf8'
    }
  })
}, function(error, result){
  console.log('readFile error: ' + error + ' result: ' + result);
  process.exit();
});
