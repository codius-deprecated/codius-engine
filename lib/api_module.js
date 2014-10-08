var ApiModule = function () {

};

ApiModule.prototype.getMethod = function(name) {
  var self = this;

  if (self.constructor.methods.indexOf(name) !== -1) {
    return self[name].bind(self);
  }
};

exports.ApiModule = ApiModule;
