const http = require("http"),
  httpProxy = require("http-proxy"),
  express = require("express"),
  fileSystem = require("./helpers/file-system");

const ServerFactory = function(config) {

  const app = express(),
    server =  http.createServer(app),
    proxy = httpProxy.createProxyServer({ secure: false });

  const init = () => {
    proxy.on("proxyRes", (proxyRes, req, res) => {
      req.emit("proxyRes", proxyRes);
    });

    proxy.on("error", (err, req, res) => {
      req.emit("proxyError", err);
    });

    fileSystem.createDir(config.downloadPath);
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
    server: server,
    proxy: proxy
  };
};

module.exports = ServerFactory;