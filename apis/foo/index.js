module.exports.foo = foo;

function foo(data, callback) {
  console.log('api module foo was called with data: ' + data);
  callback(null, data);
}
