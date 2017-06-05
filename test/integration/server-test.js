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
    let called = false;
    let logger = {
      info: function (x) {
        if ( !called ) {
          expect(x).to.equal("Rise Cache HTTP is up and running on port: 9494");
          called = true;
        } else {
          expect(x).to.equal("Rise Cache HTTPS is up and running on port: 9495");
          done();
        }
      }
    };

    serverFactory = require("../../app/server")(config, logger);

    serverFactory.start();

  });

  it("should log an error if unable to start server HTTP", (done) => {
    let logger = {
      error: function (detail, errorDetail) {
        expect(detail).to.equal("Unable to start Rise Cache HTTP");
        expect(errorDetail).to.equal('{"code":"EADDRINUSE"}');
        done();
      },
      info: function(detail) {}
    };

    serverFactory = require("../../app/server")(config, logger);
    serverFactory.start();
    serverFactory.serverHttp.emit("error", { code: "EADDRINUSE" });
  });

  it("should log an error if unable to start server HTTPS", (done) => {
    let logger = {
      error: function (detail, errorDetail) {
        expect(detail).to.equal("Unable to start Rise Cache HTTPS");
        expect(errorDetail).to.equal('{"code":"EADDRINUSE"}');
        done();
      },
      info: function(detail) {}
    };

    serverFactory = require("../../app/server")(config, logger);
    serverFactory.start();
    serverFactory.serverHttps.emit("error", { code: "EADDRINUSE" });
  });

});