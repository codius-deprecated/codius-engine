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
  engine.registerAPI('time', function (runner){
    return new TimeApi();
  });
};

var util = require('util');

var ApiModule = require('../../lib/api_module').ApiModule;

function TimeApi() {
  ApiModule.call(this);

  var self = this;
}

util.inherits(TimeApi, ApiModule);

TimeApi.methods = [
  'localtime'
];

function getDayOfYear (date) {
  var start = new Date(date.getFullYear(), 0, 1);
  var diff = date - start;
  var oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

function stdTimezoneOffset (date) {
  var jan = new Date(date.getFullYear(), 0, 1);
  var jul = new Date(date.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

function isDST (date) {
  return date.getTimezoneOffset() < stdTimezoneOffset(date);
};

TimeApi.prototype.localtime = function (callback) {
  var d = new Date();
  var localtime = {};
  localtime.tm_sec  = d.getSeconds();
  localtime.tm_min  = d.getMinutes();
  localtime.tm_hour = d.getHours();
  localtime.tm_mday = d.getDate();
  localtime.tm_mon  = d.getMonth();
  localtime.tm_year = d.getYear();
  localtime.tm_wday = d.getDay();
  localtime.tm_yday = getDayOfYear(d);
  localtime.tm_isdst = isDST(d) ? 1 : 0;
  localtime.tm_gmtoff = -d.getTimezoneOffset() * 60;
  localtime.tm_zone = String(String(d).split("(")[1]).split(")")[0];

  callback(null, localtime);
};
