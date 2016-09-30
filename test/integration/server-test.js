"use strict";

const fs = require("fs"),
  mock = require("mock-fs"),
  chai = require("chai"),
  expect = chai.expect;

const config = require("../../config/config");

describe("Server", function () {

  let serverFactory, logger;

  beforeEach(function() {
    logger = {
      info: function (details) {},
      warn: function (details) {},
      error: function(details, errDetails) {}
    };

    mock({
      [config.riseCachePath]: {
        "shutdown.txt": ""
      }
    });
  });

  afterEach(function () {
    serverFactory.stop();
  });

  it("should delete shutdown.txt on server startup", (done) => {
    serverFactory = require("../../app/server")(config, logger);
    serverFactory.start();

    fs.stat(config.shutdownFilePath, (err, stats) => {
      expect(stats).to.be.undefined;
      expect(err).to.not.be.null;
      expect(err.code).to.equal("ENOENT");  // No such file or directory.

      done();
    });
  });

  it("should log a warning when ungraceful shutdown occurred", (done) => {
    mock({
      [config.riseCachePath]: {}
    });

    logger.warn = function (x) {
      expect(x).to.equal("Rise Cache did not shutdown gracefully");
      done();
    };

    serverFactory = require("../../app/server")(config, logger);
    serverFactory.start();
  });

  it("should log info for server startup", (done) => {
    logger.info = function (x) {
      expect(x).to.equal("Rise Cache is up and running on port: 9494");
      done();
    };

    serverFactory = require("../../app/server")(config, logger);

    serverFactory.start();

  });

  it("should log an error if unable to start server", (done) => {
   logger.error = function (detail, errorDetail) {
      expect(detail).to.equal("Unable to start Rise Cache");
      expect(errorDetail).to.equal('{"code":"EADDRINUSE"}');
      done();
    };

    serverFactory = require("../../app/server")(config, logger);
    serverFactory.start();
    serverFactory.server.emit("error", { code: "EADDRINUSE" });
  });

});