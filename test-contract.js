module.exports = function(){

  var message = {
    module: 'foo',
    method: 'foo',
    data: 'my bar',
    callback: 'foo_handler'
  };

  console.log('sandboxed code posting message: ' + JSON.stringify(message));
  postMessage(message);

  onmessage = function(message){
    message = JSON.parse(message);
    if (message.type === 'callback' && message.callback === 'foo_handler') {
      foo_handler(message.error, message.result);
      process.exit();
    } else {
      throw new Error('Unknown callback: ' + message.callback);
    }
  };

  function foo_handler (error, result) {
    console.log('in sandboxed code foo_handler got error: ' + error + ' result: ' + result);
  }

};
