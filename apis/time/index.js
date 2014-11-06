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

Date.prototype.getDayOfYear = function() {
  var start = new Date(this.getFullYear(), 0, 1);
  var diff = this - start;
  var oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

Date.prototype.stdTimezoneOffset = function() {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
};

Date.prototype.isDST = function() {
  return this.getTimezoneOffset() < this.stdTimezoneOffset();
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
  localtime.tm_yday = d.getDayOfYear();
  localtime.tm_isdst = d.isDST() ? 1 : 0;
  localtime.tm_gmtoff = -d.getTimezoneOffset() * 60;
  localtime.tm_zone = String(String(d).split("(")[1]).split(")")[0];

  callback(null, localtime);
};
