/**
 * https://github.com/popomore/koa-proxy
 */

var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var coRequest = require('co-request');
var config = require('./config');
var util = require('./util');

var baseDir = path.resolve(process.cwd(), config.base);
var proxyConfig;
(function loadProxyConfig() {
  try {
    var proxyConfigPath = path.join(baseDir, '.proxy.json');
    if (!fs.existsSync(proxyConfigPath)) {
      return;
    }
    proxyConfig = JSON.parse(fs.readFileSync(proxyConfigPath).toString());
  } catch (err) {}
  // refresh proxymap every 3 seconds
  setTimeout(loadProxyConfig, 3000);
})();

module.exports = function(options) {
  options || (options = {});
  var request = coRequest.defaults({
    jar: options.jar === true,
    strictSSL: false
  });

  return function* proxy(next) {
    if (!config.proxyHost && !proxyConfig) {
      return yield next;
    }
    if (options.pass && options.pass(this.request)) {
      return yield next;
    }
    var host, hosts;
    if (config.proxyHost) {
      host = config.proxyHost;
    } else if (proxyConfig && proxyConfig.host) {
      if (typeof proxyConfig.host === 'string') {
        host = proxyConfig.host;
      } else {
        var parts = this.request.path.split('/');
        if (parts[2] === '__proxy__') {
          host = proxyConfig.host[parts[1]];
          this.request.path = '/' + parts.slice(3).join('/');
        }
      }
    }
    if (!host) {
      throw new Error('Can not resolve proxy host for request "' + this.request.href + '"!');
    }

    var t1 = new Date().getTime();

    if (Array.isArray(host)) {
      hosts = host.concat();
    } else {
      hosts = host.split(/\s*,\s*/);
    }

    var parsedBody = getParsedBody(this);

    var opt = {
      headers: Object.assign({}, this.header),
      encoding: null,
      followRedirect: options.followRedirect === false ? false : true,
      method: this.method,
      body: parsedBody,
    };
    if (options.requestOptions) {
      if (typeof options.requestOptions === 'function') {
        opt = options.requestOptions(this.request, opt);
      } else {
        Object.keys(options.requestOptions).forEach(function (option) {
          opt[option] = options.requestOptions[option];
        });
      }
    }

    while (hosts.length) {
      host = hosts.shift();

      opt.url = host.replace(/\/+$/, '') + this.request.path + (this.querystring ? '?' + this.querystring : '');
      opt.headers.host = getHost(host);

      var requestThunk = request(opt);

      try {
        var res;
        if (parsedBody) {
          res = yield requestThunk;
        } else {
          // Is there a better way?
          // https://github.com/leukhin/co-request/issues/11
          res = yield pipeRequest(this.req, requestThunk);
        }

        console.log([chalk.cyan('proxy'), chalk[util.getStatusColor(res.statusCode)](res.statusCode), (new Date().getTime() - t1) + 'ms', host, this.request.method, this.request.href].join(' - '));

        if (res.statusCode !== 404) {
          this.status = res.statusCode;
          for (var name in res.headers) {
            // http://stackoverflow.com/questions/35525715/http-get-parse-error-code-hpe-unexpected-content-length
            if (name === 'transfer-encoding') {
              continue;
            }
            this.set(name, res.headers[name]);
          }
          this.body = res.body;
          break;
        }
      } catch(e) {
        console.log([chalk.cyan('proxy'), chalk.red(e.message), host, this.request.method, this.request.href].join(' - '));
      }
    }
  };
};

function getHost(host) {
  return host.slice(host.indexOf('://') + 3).split('/')[0];
}

function getParsedBody(ctx) {
  var body = ctx.request.body;
  if (body === undefined || body === null) {
    return undefined;
  }
  var contentType = ctx.request.header['content-type'];
  if (!Buffer.isBuffer(body) && typeof body !== 'string') {
    if (contentType && contentType.indexOf('json') !== -1) {
      body = JSON.stringify(body);
    } else {
      body = body + '';
    }
  }
  return body;
}

function pipeRequest(readable, requestThunk) {
  return function(cb) {
    readable.pipe(requestThunk(cb));
  }
}
