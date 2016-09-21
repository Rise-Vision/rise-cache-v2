"use strict";

const http = require("http"),
  express = require("express");

const ServerFactory = function(config, logger) {

  const app = express(),
    server =  http.createServer(app);

  const start = () => {
    return server.listen(config.port, config.url, () => {
      logger.info("Rise Cache is up and running on port: " + config.port);
    });
  };

  const stop = () => {
    server.close();
  };


  return {
    start: start,
    stop: stop,
    app: app,
    server: server
  };
};

module.exports = ServerFactory;