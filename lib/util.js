var path = require('path');
var config = require('../lib/config');

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
  reqPath = reqPath.replace(/^\/+/, '');
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

module.exports = {
  getPathList: getPathList,
  getRequestPath: getRequestPath,
  getQueryStringPath: getQueryStringPath
};
