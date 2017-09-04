Mockup Server
=============

This is a development server use static files as restful api data source. Frontend developers can use this server as the beckend in the development phase.

Support [mockjs](http://mockjs.com/) syntax for json mockup data.


Installation
------------

    npm install mockup-server --save-dev


Usage from command line
-----------------------

Issue the command `./node_modules/.bin/mockup-server` in your project's directory.

Command line parameters:

* `-p, --port`            listening port [string] [default: "4080"]
* `-o, --origin`          used as Access-Control-Allow-Origin, if can not inferred from refer [string] [default: "*"]
* `-b, --base`            base dir for locating the api files, which is relative to `process.cwd()` [string] [default: "mockup-data"]
* `-c, --context`         the context of the api [string] [default: ""]

    If the context is "mock" and the request path "/mock/foo/bar.json" then the server will locate file "foo/bar.json" in the base dir.

* `-f, --fallback`        fallback name for an unmatched node in the path [string] [default: "_"]

    If a node in the path cann't be found, the server will replace the node name with the fallback node name, and try to locate the api file with the converteed path.

    e.g. If "/foo/1/bar.json" doen't exist, but "/foo/\_/bar.json" exists, "/foo/\_/bar.json" will be returned.

* `-e, --enable-query`    enable query string [boolean] [default: false]

    If query string is enabled, "/foo/bar.json?a=1&b=2" will be resolved to file "foo/bar/a=1&b=2.json", otherwise the query string will be ignored.

* `-i, --ignore-queries`  ignore query string param names, seperate by blank space [array] [default: []]

    A list of query string name to be ignored.

* `-t, --content-type`    default content-type of response header [string] [default: "application/json; charset=utf-8"]
* `-x, --proxy-host`      miss matched request will be sent to proxy host, seperate mutiple hosts with white space
* `-h, --help`            display usage hint
* `-v, --version`         display version

If the request method isn't "get", the server will try to locate the file with the method suffix first.

e.g. If request method is "put", and request path is "/foo/bar.json", then "/foo/bar.put.json" will be located first. If not exist, then fallback to "/foo/bar.json".
