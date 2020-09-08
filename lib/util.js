var fs = require('fs');
var path = require('path');
var sjc = require('strip-json-comments');
var mockjs = require('mockjs');
var chalk = require('chalk');
var config = require('../lib/config');

var BASE_DIR = path.resolve(process.cwd(), config.base);

function getStatusColor(status) {
  var color = 'yellow';
  if (status === 200) {
    color = 'green';
  } else if (status > 200 && status < 300) {
    color = 'blue';
  } else if (status === 404 || status >= 500 && status < 600) {
    color = 'red';
  }
  return color;
}

function fallbackWeight(p) {
  var count = 0;
  return p.split('/').reduce(function (last, item, i) {
    if (item == '_') {
      count++;
      return last + 1 + Math.pow(10, count) + i;
    }
    return last;
  }, 0);
}

function getPathList(reqPath) {
  reqPath = reqPath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  if (!reqPath) {
    return [];
  }
  var reqParts = reqPath.split('/'),
      reqLen = reqParts.length,
      tmpParts = [],
      res = [],
      i = 0;
  while (i >= 0) {
    if (tmpParts[i] == config.fallback) {
      tmpParts[i] = '';
      i--;
    } else if (tmpParts[i]) {
      tmpParts[i] = config.fallback;
      if (i == reqLen - 1) {
        if (reqParts[i].indexOf('=') === -1) {
          res.push(tmpParts.join('/'));
        }
      } else {
        i++;
      }
    } else {
      tmpParts[i] = reqParts[i];
      if (i == reqLen - 1) {
        res.push(tmpParts.join('/'));
      } else {
        i++;
      }
    }
  }
  return res.sort(function (a, b) {
    return fallbackWeight(a) - fallbackWeight(b);
  });
}

function getRequestPath(reqPath) {
  var basename = path.basename(reqPath);
  var dirname = path.dirname(reqPath);
  basename = basename.split('.');
  if (basename.length > 1) {
    basename.pop();
  }
  basename = basename.join('.');
  reqPath = path.join(dirname, basename);
  if (config.context) {
    reqPath = reqPath.replace(new RegExp('^\\/' + config.context.replace(/\//g, '\\/').replace(/\./g, '\\.') + '\\/'), '');
  }
  return reqPath;
}

function getQueryStringPath(queryString) {
  queryString = queryString.split('&').reduce(function (last, item, i) {
    var pair = item.split('=');
    if (config.ignoreQueries.indexOf(pair[0]) >= 0) {
      return last;
    } else {
      return last + (last ? '&' : '') +  pair[0] + '=' + (pair[1] || '');
    }
  }, '');
  return queryString;
}

function getMockupFile(request) {
  var reqPath = request.path;
  var extName = path.extname(reqPath).toLowerCase();
  var pathList = getPathList(getRequestPath(reqPath));
  var queryString = request.querystring;
  if (queryString && config.enableQuery && request.method == 'get') {
    var queryStringPath = getQueryStringPath(queryString);
    if (queryStringPath) {
      pathList = getPathList(getRequestPath(reqPath) + '/' + queryStringPath).concat(pathList);
    }
  }
  var p, filePath, content, httpStatus;
  while (pathList.length) {
    p = pathList.shift();
    filePath = path.join(BASE_DIR, p + '.' + request.method + extName);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      content = fs.readFileSync(filePath).toString();
      config.debug && console.log(chalk.green('found') + ' ' + filePath);
      break;
    } else {
      config.debug && console.log(chalk.red('miss') + ' ' + filePath);
    }
    filePath = path.join(BASE_DIR, p + extName);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      content = fs.readFileSync(filePath).toString();
      config.debug && console.log(chalk.green('found') + ' ' + filePath);
      break;
    } else {
      config.debug && console.log(chalk.red('miss') + ' ' + filePath);
    }
  }
  if (content && (extName == '.json' || (/^\s*\{[\s\S]*\}\s*$/).test(content))) {
    var obj = mockjs.mock(JSON.parse(sjc(content)));
    httpStatus = obj.httpStatus;
    content = JSON.stringify((obj), null, 2);
  }
  return {
    filePath: filePath,
    content: content,
    httpStatus: httpStatus
  };
}

module.exports = {
  getStatusColor: getStatusColor,
  getPathList: getPathList,
  getRequestPath: getRequestPath,
  getQueryStringPath: getQueryStringPath,
  getMockupFile: getMockupFile
};
