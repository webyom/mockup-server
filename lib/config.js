/* global process */

var _ = require('lodash');
var yargs = require('yargs');

var argv;

var config = {
  init: function() {
    argv = yargs
          .usage('Usage: $0 --port [number] --base [string] --context [string] --fallback [string] --enable-query --ignore-queries v token --content-type "application/json; charset=utf-8"')
          .alias('p', 'port').string('p').default('p', '3008').describe('p', 'listening port')
          .alias('o', 'origin').string('o').default('o', '*').describe('o', 'used as Access-Control-Allow-Origin, if can not inferred from refer')
          .alias('b', 'base').string('b').default('b', 'mockup-data').describe('b', 'base dir for locating the api files')
          .alias('c', 'context').string('c').default('c', '').describe('c', 'the context of the api')
          .alias('f', 'fallback').string('f').default('f', '_').describe('f', 'fallback name for an unmatched node in the path')
          .alias('e', 'enable-query').boolean('e').default('e', false).describe('e', 'enable query string')
          .alias('i', 'ignore-queries').array('i').default('i', []).describe('i', 'ignore query string param names, seperate by blank space')
          .alias('t', 'content-type').string('t').default('t', 'application/json; charset=utf-8').describe('t', 'default content-type of response header')
          .alias('h', 'help').describe('h', 'display usage hint')
          .alias('v', 'version').describe('v', 'display version')
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