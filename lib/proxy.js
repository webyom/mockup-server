/**
 * https://github.com/popomore/koa-proxy
 */

var join = require('url').resolve;
var coRequest = require('co-request');

module.exports = function(options) {
  options || (options = {});
  var request = coRequest.defaults({jar: options.jar === true});

  if (!(options.host || options.map)) {
    throw new Error('miss options');
  }

  return function* proxy(next) {
    var url = resolve(this.request, options);

    // don't match
    if (!url) {
      return yield* next;
    }

    var parsedBody = getParsedBody(this);

    var opt = {
      url: url + (this.querystring ? '?' + this.querystring : ''),
      headers: this.header,
      encoding: null,
      followRedirect: options.followRedirect === false ? false : true,
      method: this.method,
      body: parsedBody,
    };

    // set 'Host' header to options.host (without protocol prefix), strip trailing slash
    if (options.host) {
      opt.headers.host = options.host.slice(options.host.indexOf('://') + 3).replace(/\/$/,'');
    }

    if (options.requestOptions) {
      if (typeof options.requestOptions === 'function') {
        opt = options.requestOptions(this.request, opt);
      } else {
        Object.keys(options.requestOptions).forEach(function (option) {
          opt[option] = options.requestOptions[option];
        });
      }
    }

    var requestThunk = request(opt);

    if (parsedBody) {
      var res = yield requestThunk;
    } else {
      // Is there a better way?
      // https://github.com/leukhin/co-request/issues/11
      var res = yield pipeRequest(this.req, requestThunk);
    }

    this.status = res.statusCode;
    for (var name in res.headers) {
      // http://stackoverflow.com/questions/35525715/http-get-parse-error-code-hpe-unexpected-content-length
      if (name === 'transfer-encoding') {
        continue;
      }
      this.set(name, res.headers[name]);
    }

    this.body = res.body;

    if (options.yieldNext) {
      yield next;
    }
  };
};

function resolve(request, options) {
  var path;
  if (typeof options.map === 'function') {
    path = options.map(request);
    return path && options.host ? join(options.host, path) : null;
  } else {
    return request.path;
  }
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
