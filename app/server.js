"use strict";

const http = require("http"),
  express = require("express"),
  fileSystem = require("./helpers/file-system");

const ServerFactory = function(config, logger) {

  const app = express(),
    server = http.createServer(app);

  const start = () => {
    fileSystem.delete(config.shutdownFilePath);

    server.on("error", (err) => {
      logger.error("Unable to start Rise Cache", JSON.stringify(err));
    });

    return server.listen(config.port, config.url, () => {
      logger.info("Rise Cache is up and running on port: " + config.port);
    });
  };

  const stop = () => {
    server.close((err) => {
      if (!err) {
        fileSystem.createFile(config.shutdownFilePath);
      }
    });
  };

  return {
    start: start,
    stop: stop,
    app: app,
    server: server
  };
};

module.exports = ServerFactory;