var codius = require('codius-api');

function LocalStorage() {
}

LocalStorage.prototype.getItem = function(key, callback) {
  codius.call('localstorage', 'getItem',key, callback);
};


LocalStorage.prototype.setItem = function(key, value, callback) {
  codius.call('localstorage', 'setItem', key, callback);
};

LocalStorage.prototype.removeItem = function(key, callback) {
  codius.call('localstorage', 'removeItem', key, callback);
};

LocalStorage.prototype.clear = function(callback) {
  codius.call('localstorage', 'clear', callback);
};

LocalStorage.prototype.key = function(index, callback) {
  codius.call('localstorage', 'key', index, callback);
};

module.exports = new LocalStorage();
