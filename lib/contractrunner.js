//------------------------------------------------------------------------------
/*
    This file is part of Codius: https://github.com/codius
    Copyright (c) 2014 Ripple Labs Inc.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose  with  or without fee is hereby granted, provided that the above
    copyright notice and this permission notice appear in all copies.

    THE  SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH  REGARD  TO  THIS  SOFTWARE  INCLUDING  ALL  IMPLIED  WARRANTIES  OF
    MERCHANTABILITY  AND  FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY  SPECIAL ,  DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER  RESULTING  FROM  LOSS  OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION  OF  CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
//==============================================================================

var fs = require('fs');
var crypto = require('crypto');
var events = require('events');
var util = require('util');
var Sandbox = require('codius-node-sandbox');

/**
 *  Class to run contracts.
 *
 *  @param {Object} data.manifest
 *  @param {Object} data.apis
 *  @param {String} data.manifest_hash
 */
function ContractRunner(config, data) {
  events.EventEmitter.call(this);

  var self = this;

  self.config = config;

  if (typeof data !== 'object' ||
    typeof data.manifest !== 'object') {

    throw new Error('ApiHandler must be instantiated with the manifest');
  }

  self._manifest = data.manifest;
  self._apis = {};
  self._manifest_hash = data.manifest_hash;
  self._additional_libs = data.additional_libs || '';
  self._env = data.env;
  self._nextFreeFileDescriptor = 4;

  // Add the manifest_hash to the manifest object so it will
  // be passed to the API modules when they are called
  self._manifest.manifest_hash = data.manifest_hash;

  // Setup sandbox instance
  self._sandbox  = new Sandbox({
    enableGdb: self.config.enableGdb,
    enableValgrind: self.config.enableValgrind,
    disableNacl: self.config.disableNacl
  });

  self._sandbox.on('exit', self.handleExit.bind(self));
}

util.inherits(ContractRunner, events.EventEmitter);

/**
 * Expose a set of APIs to the running contract.
 *
 * Calling this method will overwrite any previously exposed APIs.
 */
ContractRunner.prototype.setApis = function(apis) {
  this._apis = apis;
};

/**
 *  Call the specified method, in the specified module,
 *  with the contract manifest, the given data, and the callback
 *
 *  @param {String} parameters.api
 *  @param {String} parameters.method
 *  @param {Object} parameters.data
 *  @param {Function} callback
 */
ContractRunner.prototype.callApi = function(parameters, callback) {
  var self = this;

  if (!self._apis.hasOwnProperty(parameters.api)) {
    callback(new Error('Unknown or undeclared API Module: ' + parameters.api));
    return;
  }
  var api = self._apis[parameters.api];

  if (parameters.method.indexOf('_') === 0) {
    callback(new Error('Cannot access private method: ' + parameters.method));
    return;
  }

  var method = api.getMethod(parameters.method);
  if (typeof method !== 'function') {
    callback(new Error('Unknown API Method: ' + parameters.api + '.' + parameters.method));
    return;
  }

  var args = parameters.data;
  args.push(callback);
  method.apply(api, args);
};

/**
 *  Function to handle messages sent from within the sandbox.
 *
 *  @param {String} message.api
 *  @param {String} message.method
 *  @param {Object} [[]] message.data
 *  @param {Function} callback
 */
ContractRunner.prototype.handleMessage = function(message, callback) {
  var self = this;

  if (typeof message !== 'object' || !message.api || !message.method) {
    callback(new Error('Invalid message: must pass an object with the fields `api`, `method`, and optionally `data`.'));
    return;
  }

  var parameters = {
    api: message.api,
    method: message.method,
    data: message.data
  };

  self.callApi(parameters, callback);

};

ContractRunner.prototype.run = function() {
  var self = this;

  var message_handler = self.handleMessage.bind(self);
  self._sandbox.setApi(message_handler);

  self._sandbox.passthroughStdio();

  self._sandbox.run(self._manifest.main, { env: self._env });
};

ContractRunner.prototype.getManifest = function () {
  return this._manifest;
};

ContractRunner.prototype.getManifestHash = function () {
  return this._manifest_hash;
};

ContractRunner.prototype.getPortListener = function (port) {
  if (!this._apis.net) {
    throw new Error('Tried to simulate a listener for a contract that does not support networking.');
  }

  return this._apis.net.getPortListener(port);
};

ContractRunner.prototype.notifyAboutPortListener = function (port, listener) {
  this.emit('portListener', {
    port: port,
    listener: listener
  });
};

ContractRunner.prototype.getNextFreeFileDescriptor = function () {
  return this._nextFreeFileDescriptor++;
};

ContractRunner.prototype.handleExit = function (code, signal) {
  var self = this;

  self.emit('exit', code, signal);
}

exports.ContractRunner = ContractRunner;
