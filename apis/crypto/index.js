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

exports.init = function (engine, config) {
  engine.registerAPI('crypto', function (runner){
    return new CryptoApi();
  });
};


var crypto = require('crypto');
var util = require('util');

var ApiModule = require('../../lib/api_module').ApiModule;

function CryptoApi() {
  ApiModule.call(this);

  var self = this;
}

util.inherits(CryptoApi, ApiModule);

CryptoApi.methods = [
  'randomBytes'
];

CryptoApi.prototype.randomBytes = function (size, callback) {
  crypto.randomBytes(size, function (error, bytes) {
    if (error) {
      callback(error);
    } else {
      callback(null, bytes.toString('hex'));
    }
  });
};
