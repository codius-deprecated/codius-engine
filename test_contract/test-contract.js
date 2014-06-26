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
    filename: 'test-file.txt',
    options: {
      encoding: 'utf8'
    }
  })
}, function(error, result){
  console.log('readFile error: ' + error + ' result: ' + result);
  process.exit();
});
