"use strict";

const sinon = require("sinon"),
  chai = require("chai"),
  expect = chai.expect,
  app = require("../../app/app")(),
  config = require("../../config/config");

describe("AppFactory", () => {
  let spy = null;
  let originalException = null;

  before(function() {
    config.debugging = true;
    spy = sinon.spy(console, "error");

    app.start();

    // Remove the mocha listener - https://goo.gl/jLCBDd.
    originalException = process.listeners("uncaughtException").pop();
    process.removeListener("uncaughtException", originalException);
  });

  after(function() {
    spy.restore();
    app.stop();
  });

  describe("Logging", () => {

    it("should log an error when an uncaught exception occurs", (done) => {
      var error = new Error("err");

      // Intentionally cause an uncaught exception.
      process.nextTick(function() {
        throw error;
      });

      process.nextTick(function() {
        process.listeners("uncaughtException").push(originalException);
        expect(spy.getCall(0).args[0]).to.contain("ERROR: Uncaught exception err");
        done();
      });
    });

  });

});