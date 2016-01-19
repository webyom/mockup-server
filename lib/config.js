/* global process */

var _ = require('lodash');
var yargs = require('yargs');

var argv;

var config = {
  init: function() {
    argv = yargs
          .usage('Usage: $0 --port [number] --base [string] --context [string] --fallback [string] --enable-query --ignore-queries v token --content-type "application/json; charset=utf-8"')
          .alias('p', 'port').default('p', 3008).describe('p', 'listening port')
          .alias('b', 'base').default('b', 'mockup-data').describe('b', 'base dir for locating the api files')
          .alias('c', 'context').string('c').default('c', '').describe('c', 'the context of the api')
          .alias('f', 'fallback').default('f', '_').describe('f', 'fallback name for an unmatched node in the path')
          .alias('e', 'enable-query').boolean('e').describe('e', 'enable query string')
          .alias('i', 'ignore-queries').array('i').default('i', []).describe('i', 'ignore query string param names, seperate by ","')
          .alias('t', 'content-type').default('t', 'application/json; charset=utf-8').describe('t', 'default content-type of response header')
          .alias('h', 'help').boolean('h').describe('h', 'Help')
          .argv;
    argv.c = argv.context = argv.c.replace(/^\/+|\/+$/g, '');
    _.extend(config, argv);
    config.init = function() {};
    return config;
  },

  getArgv: function() {
    return argv;
  },

  argHelp: function() {
    return yargs.help();
  }
};

config.init();

module.exports = config;