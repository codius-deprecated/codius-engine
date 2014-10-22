var constants   = require('constants');

var SystemError = {};

SystemError.create = function (path, code, methodName) {
  if ("number" !== typeof constants[code]) {
    console.error('Tried to create error with invalid error code "'+code+'"');
    code = 'EFAULT';
  }

  var error = new Error(code+', '+methodName+' \''+path+'\'');
  error.errno = constants[code];
  error.code = code;
  error.path = path;
  return error;
};

exports.SystemError = SystemError;
