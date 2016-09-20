"use strict";

const chai = require("chai"),
    expect = chai.expect;

const config = require("../../config/config");

describe("Server", function () {

  let server;

  afterEach(function () {
    server.stop();
  });

  it("should log info for server startup", (done) => {
    let logger = {
      info: function (x){
        expect(x).to.equal("Rise Cache is up and running on port: 9494");
        done();
      }
    };

    server = require("../../app/server")(config, logger);

    server.start();

  });


});