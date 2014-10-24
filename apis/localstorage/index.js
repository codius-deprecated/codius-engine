exports.init = function (engine, config) {
  engine.registerAPI('localstorage', function (runner, storage){
    var manifestHash = runner.getManifestHash();
    return new LocalStorage({
      contractId: manifestHash,
      storage: storage
    });
  });
};

var util = require('util');

var ApiModule = require('../../lib/api_module').ApiModule;

function LocalStorage(opts) {
  var self = this;

  ApiModule.call(this);

  self._contractId = opts.contractId;
  self._storage = opts.storage || LocalStorage.defaultStorage();
}
util.inherits(LocalStorage, ApiModule);

LocalStorage.methods = [
  'getItem',
  'setItem',
  'removeItem',
  'clear',
  'key'
];

/**
 *  Default storage option simply uses an in-memory object
 */
LocalStorage.defaultStorage = function(){
  'use strict';

  var storageObject = {};

  function getItem(contractId, key, callback) {
    if (typeof storageObject[contractId] !== 'object') {
      storageObject[contractId] = {};
    }
    callback(null, storageObject[contractId][key]);
  }

  function setItem(contractId, key, value, callback) {
    if (typeof storageObject[contractId] !== 'object') {
      storageObject[contractId] = {};
    }
    storageObject[contractId][key] = value;
    callback();
  }

  function removeItem(contractId, key, callback) {
    if (typeof storageObject[contractId] !== 'object') {
      storageObject[contractId] = {};
    }
    delete storageObject[contractId][key];
    callback();
  }

  function clear(contractId, callback) {
    storageObject[contractId] = {};
    callback();
  }

  function key(contractId, index, callback) {
    if (typeof storageObject[contractId] !== 'object') {
      storageObject[contractId] = {};
    }
    callback(null, Object.keys(storageObject[contractId])[index]);
  }

  var methods = {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    key: key
  };
  return methods;
};

/**
 *  Takes a function that will be used to 
 *  provide contracts with persistent storage.
 *
 *  Note that each function should expect the 
 *  contractId as the first parameter.
 *
 *  @param {Function} contractStorage.getItem
 *  @param {Function} contractStorage.setItem
 *  @param {Function} contractStorage.removeItem
 *  @param {Function} contractStorage.clear
 *  @param {Function} contractStorage.key
 */
LocalStorage.prototype.setStorage = function(storage) {
  var self = this;

  self._storage = storage;
};


LocalStorage.prototype.getItem = function(key, callback) {
  var self = this;

  if (typeof self._storage.getItem !== 'function') {
    callback(new Error('LocalStorage module supplied does not support getItem()'));
    return;
  }

  try {
    self._storage.getItem.call(self._storage, self._contractId, key, callback);
  } catch (error) {
    callback(error);
  }

};

LocalStorage.prototype.setItem = function(key, value, callback) {
  var self = this;

  if (typeof self._storage.setItem !== 'function') {
    callback(new Error('LocalStorage module supplied does not support setItem()'));
    return;
  }

  try {
    self._storage.setItem.call(self._storage, self._contractId, key, value, callback);
  } catch (error) {
    callback(error);
  }

};

LocalStorage.prototype.removeItem = function(key, callback) {
  var self = this;

  if (typeof self._storage.removeItem !== 'function') {
    callback(new Error('LocalStorage module supplied does not support removeItem()'));
    return;
  }

  try {
    self._storage.removeItem.call(self._storage, self._contractId, key, callback);
  } catch (error) {
    callback(error);
  }

};

LocalStorage.prototype.clear = function(callback) {
  var self = this;

  if (typeof self._storage.clear !== 'function') {
    callback(new Error('LocalStorage module supplied does not support clear()'));
    return;
  }

  try {
    self._storage.clear.call(self._storage, self._contractId, callback);
  } catch (error) {
    callback(error);
  }

};

LocalStorage.prototype.key = function(index, callback) {
  var self = this;

  if (typeof self._storage.key !== 'function') {
    callback(new Error('LocalStorage module supplied does not support key()'));
    return;
  }

  try {
    self._storage.key.call(self._storage, self._contractId, index, callback);
  } catch (error) {
    callback(error);
  }

};
