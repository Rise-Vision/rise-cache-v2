const http = require("http"),
  express = require("express"),
  fileSystem = require("./helpers/file-system");

const ServerFactory = function(config) {

  const app = express(),
    server =  http.createServer(app);

  const init = () => {
    fileSystem.createDir(config.downloadPath);
    fileSystem.createDir(config.cachePath);

  };

  const start = () => {
    return server.listen(config.port, config.url, () => {
      console.info("Rise Cache is up and running on port: " + config.port);
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