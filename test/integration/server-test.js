"use strict";

const chai = require("chai"),
    expect = chai.expect;

const config = require("../../config/config");

describe("Server", function () {

  let serverFactory;

  afterEach(function (done) {
    serverFactory.stop(() => {
      done();
    });
  });

  it("should log info for server startup", (done) => {
    let logger = {
      info: function (x) {
        expect(x).to.equal("Rise Cache is up and running on port: 9494");
        done();
      }
    };

    serverFactory = require("../../app/server")(config, logger);

    serverFactory.start();

  });

  it("should log an error if unable to start server", (done) => {
    let logger = {
      error: function (detail, errorDetail) {
        expect(detail).to.equal("Unable to start Rise Cache");
        expect(errorDetail).to.equal('{"code":"EADDRINUSE"}');
        done();
      },
      info: function(detail) {}
    };

    serverFactory = require("../../app/server")(config, logger);
    serverFactory.start();
    serverFactory.server.emit("error", { code: "EADDRINUSE" });
  });

});