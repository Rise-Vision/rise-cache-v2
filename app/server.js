/*eslint no-console: ["error", { allow: ["log"] }] */

const http = require("http");
const express = require("express");

const ServerFactory = function(config, createDir){

  const app = express(),
    server =  http.createServer(app);

  const init = () => {
    createDir(config.downloadPath);
  };

  const start = () => {
    return server.listen(config.port, config.url, () => {
      console.log("Rise Cache is up and running on port: " + config.port);
    });
  };

  const stop = () => {
    server.close();
  };

  return {
    init: init,
    start: start,
    stop: stop,
    app: app,
    server: server
  };
};

module.exports = ServerFactory;