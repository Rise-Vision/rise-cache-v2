"use strict";

const chai = require("chai"),
  expect = chai.expect,
  sinon = require("sinon");


describe("Logger", () => {
  let logger, clock;
  let externalLogger = {
    log: function (event, event_details, error_details, date) {}
  };
  let fileSystem = {
    appendToLog: function (datetime, message) {}
  };
  let debugging = true;
  let dateString = "2016/09/20 00:00:00";

  let externalLoggerLogSpy, fileSystemAppendToLogSpy, consoleInfoSpy, consoleErrorSpy, consoleWarnSpy;

  before( function () {
    let date = new Date("09/20/2016");
    clock = sinon.useFakeTimers(date.getTime());
  });

  describe("Logger debugging and external logger", () => {

    before( function () {
      debugging = true;
      logger = require("../../app/helpers/logger/logger")(debugging, externalLogger, fileSystem);
    });

    beforeEach(function () {
      externalLoggerLogSpy = sinon.spy(externalLogger, "log");
      fileSystemAppendToLogSpy = sinon.spy(fileSystem, "appendToLog");
      consoleInfoSpy = sinon.spy(console, "info");
      consoleErrorSpy = sinon.spy(console, "error");
      consoleWarnSpy = sinon.spy(console, "warn");
    });

    afterEach(function () {
      externalLoggerLogSpy.restore();
      fileSystemAppendToLogSpy.restore();
      consoleInfoSpy.restore();
      consoleErrorSpy.restore();
      consoleWarnSpy.restore();
    });

    it("should log an info event", () => {
      let detail = "test info";
      let message = "INFO: " + detail;
      logger.info(detail);

      expect(consoleInfoSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(externalLoggerLogSpy.calledWith("info", detail)).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an error event", () => {
      let detail = "test error";
      let errorDetails = "exception 1";
      let message = "ERROR: " + detail + " " + errorDetails;
      logger.error(detail, errorDetails);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(externalLoggerLogSpy.calledWith("error", detail, errorDetails)).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log a warn event", () => {
      let detail = "test warn";
      let message = "WARNING: " + detail;
      logger.warn(detail);

      expect(consoleWarnSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(externalLoggerLogSpy.calledWith("warning", detail)).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });
  });

  describe("Logger no debugging", () => {

    before( function () {
      debugging = false;
      logger = require("../../app/helpers/logger/logger")(debugging, externalLogger, fileSystem);
    });

    beforeEach(function () {
      externalLoggerLogSpy = sinon.spy(externalLogger, "log");
      fileSystemAppendToLogSpy = sinon.spy(fileSystem, "appendToLog");
      consoleInfoSpy = sinon.spy(console, "info");
      consoleErrorSpy = sinon.spy(console, "error");
      consoleWarnSpy = sinon.spy(console, "warn");
    });

    afterEach(function () {
      externalLoggerLogSpy.restore();
      fileSystemAppendToLogSpy.restore();
      consoleInfoSpy.restore();
      consoleErrorSpy.restore();
      consoleWarnSpy.restore();
    });

    it("should log an info event", () => {
      let detail = "test info";
      let message = "INFO: " + detail;
      logger.info(detail);

      expect(consoleInfoSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(externalLoggerLogSpy.calledWith("info", detail)).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an error event", () => {
      let detail = "test error";
      let errorDetails = "exception 1";
      let message = "ERROR: " + detail + " " + errorDetails;
      logger.error(detail, errorDetails);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(externalLoggerLogSpy.calledWith("error", detail, errorDetails)).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log a warn event", () => {
      let detail = "test warn";
      let message = "WARNING: " + detail;
      logger.warn(detail);

      expect(consoleWarnSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(externalLoggerLogSpy.calledWith("warning", detail)).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });
  });


  describe("Logger no external logger", () => {

    before( function () {
      debugging = false;
      let nullExternalLogging = null;
      logger = require("../../app/helpers/logger/logger")(debugging, nullExternalLogging, fileSystem);
    });

    beforeEach(function () {
      externalLoggerLogSpy = sinon.spy(externalLogger, "log");
      fileSystemAppendToLogSpy = sinon.spy(fileSystem, "appendToLog");
      consoleInfoSpy = sinon.spy(console, "info");
      consoleErrorSpy = sinon.spy(console, "error");
      consoleWarnSpy = sinon.spy(console, "warn");
    });

    afterEach(function () {
      externalLoggerLogSpy.restore();
      fileSystemAppendToLogSpy.restore();
      consoleInfoSpy.restore();
      consoleErrorSpy.restore();
      consoleWarnSpy.restore();
    });

    it("should log an info event", () => {
      let detail = "test info";
      let message = "INFO: " + detail;
      logger.info(detail);

      expect(consoleInfoSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(externalLoggerLogSpy.calledWith("info", detail)).to.be.false;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an error event", () => {
      let detail = "test error";
      let errorDetails = "exception 1";
      let message = "ERROR: " + detail + " " + errorDetails;
      logger.error(detail, errorDetails);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(externalLoggerLogSpy.calledWith("error", detail, errorDetails)).to.be.false;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log a warn event", () => {
      let detail = "test warn";
      let message = "WARNING: " + detail;
      logger.warn(detail);

      expect(consoleWarnSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(externalLoggerLogSpy.calledWith("warning", detail)).to.be.false;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });
  });

});