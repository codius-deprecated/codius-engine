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
var fs = require('fs');

var AbstractFilesystemNode = require('./abstract_filesystem_node').AbstractFilesystemNode;

var AbstractFile = function () {
  AbstractFilesystemNode.apply(this);
};

util.inherits(AbstractFile, AbstractFilesystemNode);

AbstractFile.prototype.stat = function (callback) {
  fs.stat(this.getRealPath(), callback);
};

AbstractFile.prototype.lstat = function (callback) {
  fs.lstat(this.getRealPath(), callback);
};

exports.AbstractFile = AbstractFile;
