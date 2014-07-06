exports.init = function (engine, config) {
  engine.registerAPI('foo', {
    foo: foo
  });
};

function foo(manifest, data, callback) {
  console.log('api module foo was called with data: ' + data);
  callback(null, data);
}
