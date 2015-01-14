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

var AbstractFilesystemNode = require('./abstract_filesystem_node').AbstractFilesystemNode;

var AbstractDirectory = function () {
  AbstractFilesystemNode.apply(this);
};

util.inherits(AbstractDirectory, AbstractFilesystemNode);

// We don't really care about any of the stat properties of the virtual
// directories, so we just return something realistic.
// TODO Could be more realistic.
AbstractDirectory.STAT_FOR_DIRECTORIES = {
  dev: 2049,
  mode: 16893,
  nlink: 5,
  uid: 1000,
  gid: 1000,
  rdev: 0,
  blksize: 4096,
  ino: 6695080,
  size: 4096,
  blocks: 8,
  atime: 'Tue Oct 07 2014 11:02:22 GMT-0700 (PDT)',
  mtime: 'Tue Oct 07 2014 10:54:18 GMT-0700 (PDT)',
  ctime: 'Tue Oct 07 2014 10:54:18 GMT-0700 (PDT)'
};

AbstractDirectory.prototype.isDirectory = function () {
  return true;
};

AbstractDirectory.prototype.stat =
AbstractDirectory.prototype.lstat = function (callback) {
  callback(null, AbstractDirectory.STAT_FOR_DIRECTORIES);
};

exports.AbstractDirectory = AbstractDirectory;
