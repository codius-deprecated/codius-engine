(function(){

  var other_thing = require('./sub-mod-test');

  module.exports = {
    sub_module: 'hello from down below',
    other_thing: other_thing
  };
})();
