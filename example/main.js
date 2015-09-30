/**
 * Example of how you would bootstrap load testing
 */
var LoaderForeman = require('../src/foreman'),
    config = require('./config');

var foreman = new LoaderForeman(config);
foreman.run();