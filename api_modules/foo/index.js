module.exports.foo = foo;

function foo(data, callback) {
  // console.log('foo was called with data: ' + data);
  callback(null, 'bar');
}
