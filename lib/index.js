/* global process */

var fs = require('fs');
var path = require('path');
var koa = require('koa');
var chalk = require('chalk');
var config = require('./config');
var util = require('./util');

var baseDir = path.resolve(process.cwd(), config.base);
var app = koa();

app.use(function *(next) {
  this.response.set('Access-Control-Allow-Origin', '*');
  this.response.set('Access-Control-Allow-Credentials', 'true');
  this.response.set('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE');
  yield next;
});

app.use(function *(next) {
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

app.use(function *() {
  var t1 = new Date().getTime();
  var method = this.request.method.toLowerCase();
  if (method == 'options') {
    this.body = '';
  } else {
    var reqPath = this.request.path;
    var extName = path.extname(reqPath).toLowerCase();
    var pathList = util.getPathList(util.getRequestPath(reqPath));
    var queryString = this.request.querystring;
    if (queryString && config.enableQuery && method == 'get') {
      var queryStringPath = util.getQueryStringPath(queryString);
      if (queryStringPath) {
        pathList = util.getPathList(util.getRequestPath(reqPath) + '/' + queryStringPath).concat(pathList);
      }
    }
    var p, filePath, content;
    while (pathList.length) {
      p = pathList.shift();
      if (method != 'get') {
        filePath = path.join(baseDir, p + '.' + method + extName);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          content = fs.readFileSync(filePath);
          break;
        }
      }
      filePath = path.join(baseDir, p + extName);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        content = fs.readFileSync(filePath);
        break;
      }
    }
    if (content) {
      this.body = content;
    } else {
      this.response.status = 404;
    }
  }
  var t2 = new Date().getTime();
  console.log([this.response.status === 404 ? chalk.red(this.response.status) : chalk.green(this.response.status), (t2 - t1) + 'ms', this.request.method, this.request.href, filePath].join(' - '));
});

console.log(chalk.green('mockup server is serving from dir "' + baseDir + '", listening on port ' + config.port + '...'));
app.listen(config.port);
