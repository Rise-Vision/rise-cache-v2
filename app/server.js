"use strict";

const http = require("http"),
  https = require("https"),
  express = require("express");

const ServerFactory = function(config, logger) {

  const app = express(),
    serverHttps =  https.createServer(config.httpsOptions, app),
    serverHttp =  http.createServer(app);

  const start = () => {

    serverHttp.on("error", (err) => {
      logger.error("Unable to start Rise Cache HTTP", JSON.stringify(err));
    });

    serverHttp.listen(config.httpPort, config.url, () => {
      logger.info("Rise Cache HTTP is up and running on port: " + config.httpPort);
    });

    serverHttps.on("error", (err) => {
      logger.error("Unable to start Rise Cache HTTPS", JSON.stringify(err));
    });

    serverHttps.listen(config.httpsPort, config.url, () => {
      logger.info("Rise Cache HTTPS is up and running on port: " + config.httpsPort);
    });
  };

  const stop = (cbHttp, cbHttps) => {
    serverHttp.close(() => {
      if (cbHttp) {
        cbHttp();
      }
    });

    serverHttps.close(() => {
      if (cbHttps) {
        cbHttps();
      }
    });
  };


  return {
    start: start,
    stop: stop,
    app: app,
    serverHttp: serverHttp,
    serverHttps: serverHttps
  };
};

module.exports = ServerFactory;