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

var util = require('util');
var path = require('path');

var AbstractFile = require('./abstract_file').AbstractFile;

var VirtualFile = function (hash, contractFilesystemPath) {
  AbstractFile.apply(this);

  this._hash = hash;
  this._contractFilesystemPath = contractFilesystemPath;
};

util.inherits(VirtualFile, AbstractFile);

VirtualFile.prototype.getRealPath = function () {
	var self = this;

	var firstDir = self._hash.slice(0, 2);
	var secondDir = self._hash.slice(2, 4);

  return path.join(this._contractFilesystemPath, firstDir, secondDir, this._hash);
};

exports.VirtualFile = VirtualFile;
