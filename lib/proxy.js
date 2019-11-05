/**
 * https://github.com/popomore/koa-proxy
 */

var chalk = require('chalk');
var join = require('url').resolve;
var coRequest = require('co-request');
var util = require('./util');

module.exports = function(options) {
  options || (options = {});
  var request = coRequest.defaults({jar: options.jar === true});

  return function* proxy(next) {
    if (options.pass && options.pass(this.request)) {
      return yield next;
    }
    var host, hosts;
    if (options.hostMap) {
      var cate = this.request.path.split('/')[1] || '';
      if (cate.indexOf('__mock__') === 0) {
        cate = cate.slice('__mock__'.length);
      } else {
        cate = '';
      }
      host = options.hostMap[cate];
    } else {
      host = options.host;
    }
    if (!host) {
      throw new Error('Can not resolve proxy host for request "' + this.request.href + '"!');
    }

    var t1 = new Date().getTime();

    if (Array.isArray(host)) {
      hosts = host.concat();
    } else {
      hosts = host.split(/\s+/);
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

      opt.url = join(host, this.request.path) + (this.querystring ? '?' + this.querystring : '');
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
  // without protocol prefix, strip trailing slash
  return host.slice(host.indexOf('://') + 3).replace(/\/$/,'');
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

function pipeRequest(readable, requestThunk){
  return function(cb) {
    readable.pipe(requestThunk(cb));
  }
}
