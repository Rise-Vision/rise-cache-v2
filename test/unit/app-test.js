"use strict";

const sinon = require("sinon"),
  chai = require("chai"),
  expect = chai.expect,
  mock = require("mock-fs"),
  app = require("../../app/app")(),
  config = require("../../config/config");

describe("AppFactory", () => {
  let spy = null;
  let originalException = null;

  before(() => {
    mock({
      ["test/RiseDisplayNetworkII.ini"]: "displayid=no-displayId",
      [config.logFilePath]: "",
    });

    config.debugging = true;
    config.riseDisplayNetworkIIPath = "test/RiseDisplayNetworkII.ini";
    spy = sinon.spy(console, "error");

    app.start();

    // Remove the mocha listener - https://goo.gl/jLCBDd.
    originalException = process.listeners("uncaughtException").pop();
    process.removeListener("uncaughtException", originalException);
  });

  after((done) => {
    app.stop(() => {
      done();
    });

    mock.restore();
    spy.restore();
  });

  describe("Logging", () => {

    it("should log an error when an uncaught exception occurs", (done) => {
      var error = new Error("err");

      // Intentionally cause an uncaught exception.
      process.nextTick(() => {
        throw error;
      });

      process.nextTick(() => {
        process.listeners("uncaughtException").push(originalException);
        sinon.assert.calledWith(spy, sinon.match(/ERROR: Uncaught exception err$/));
        done();
      });
    });

  });

});