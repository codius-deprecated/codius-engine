var codius = process.binding('async');

function LocalStorage() {

}

LocalStorage.prototype.getItem = function(key, callback) {
  codius.postMessage({
    type: 'api',
    api: 'localstorage',
    method: 'getItem',
    data: [key]
  }, callback);
};


LocalStorage.prototype.setItem = function(key, value, callback) {
  codius.postMessage({
    type: 'api',
    api: 'localstorage',
    method: 'setItem',
    data: [key, value]
  }, callback);
};

LocalStorage.prototype.removeItem = function(key, callback) {
  codius.postMessage({
    type: 'api',
    api: 'localstorage',
    method: 'removeItem',
    data: [key]
  }, callback);
};

LocalStorage.prototype.clear = function(callback) {
  codius.postMessage({
    type: 'api',
    api: 'localstorage',
    method: 'clear',
    data: [ ]
  }, callback);
};

LocalStorage.prototype.key = function(index, callback) {
  codius.postMessage({
    type: 'api',
    api: 'localstorage',
    method: 'key',
    data: [index]
  }, callback);
};

module.exports = new LocalStorage();
