/* global process */

var path = require('path');
var url = require('url');
var koa = require('koa');
var chalk = require('chalk');
var proxy = require('./proxy');
var config = require('./config');
var util = require('./util');

var baseDir = path.resolve(process.cwd(), config.base);
var app = koa();

if (config.proxyHost) {
  app.use(proxy({
    jar: true,
    host: config.proxyHost,
    map: function (request) {
      var mockup = util.getMockupFile(request);
      if (mockup.content) {
        return null;
      } else {
        console.log([chalk.cyan('proxy'), config.proxyHost, request.method, request.href].join(' - '));
        return request.path;
      }
    }
  }));
}

app.use(function* (next) {
  var urlObj, origin;
  if (this.request.header.referer) {
    urlObj = url.parse(this.request.header.referer);
    origin = urlObj.protocol + '//' + urlObj.host;
  } else {
    origin = config.origin;
  }
  this.response.set('Access-Control-Allow-Origin', origin);
  this.response.set('Access-Control-Allow-Credentials', 'true');
  this.response.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE');
  this.response.set('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With');
  yield next;
});

app.use(function* (next) {
  var extName = path.extname(this.request.path).toLowerCase();
  var contentTypeMap = {
    '.json': 'application/json; charset=utf-8',
    '.jsonp': 'text/javascript; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.html': 'text/html; charset=utf-8'
  };
  this.response.set('Content-Type', contentTypeMap[extName] || config.contentType);
  yield next;
});

app.use(function* () {
  var t1 = new Date().getTime();
  var method = this.request.method.toLowerCase();
  var mockup = {
    filePath: '',
    content: ''
  };
  if (method == 'options') {
    this.response.status = 204;
  } else {
    var mockup = util.getMockupFile(this.request);
    if (mockup.content) {
      this.body = mockup.content;
    } else {
      this.response.status = 404;
    }
  }
  var t2 = new Date().getTime();
  var colorMap = {
    200: 'green',
    204: 'blue',
    404: 'red'
  };
  console.log([chalk[colorMap[this.response.status] || 'yellow'](this.response.status), (t2 - t1) + 'ms', this.request.method, this.request.href, mockup.filePath].join(' - '));
});

console.log(chalk.green('mockup server is serving from dir "' + baseDir + '", listening on port ' + config.port + '...'));
app.listen(config.port);
