"use strict";

const chai = require("chai"),
  expect = chai.expect,
  sinon = require("sinon");


describe("Logger", () => {
  let logger, clock;
  let fileSystem = {
    appendToLog: function (datetime, message) {},
    getFileName: function (url) {return "";}
  };
  let debugging = true;
  let dateString = "2016/09/20 00:00:00";
  let displayId = "displayIdTest";
  let version = "1.0.0";
  let os = "win32";

  let fileSystemAppendToLogSpy, consoleInfoSpy, consoleErrorSpy, consoleWarnSpy, processSendStub;

  before( function () {
    let date = new Date("09/20/2016");
    clock = sinon.useFakeTimers(date.getTime());
  });

  describe("Debugging and log to player", () => {

    before( function () {
      debugging = true;
      logger = require("../../../../app/helpers/logger/logger")(debugging, fileSystem, displayId, version, os);
      process.send = function(){};
    });

    beforeEach(function () {
      fileSystemAppendToLogSpy = sinon.spy(fileSystem, "appendToLog");
      consoleInfoSpy = sinon.spy(console, "info");
      consoleErrorSpy = sinon.spy(console, "error");
      consoleWarnSpy = sinon.spy(console, "warn");
      processSendStub = sinon.stub(process, "send");
    });

    afterEach(function () {
      fileSystemAppendToLogSpy.restore();
      consoleInfoSpy.restore();
      consoleErrorSpy.restore();
      consoleWarnSpy.restore();
      processSendStub.restore();
    });

    it("should log an info event with no file details", () => {
      let detail = "test info";
      let message = "INFO: " + detail;
      logger.info(detail);

      expect(consoleInfoSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(processSendStub.calledWith( {
        event: "info",
        event_details: detail,
        error_details: "",
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: "",
        file_url: ""
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an info event with file details", () => {
      let detail = "test info";
      let url = "http://test.com/image.jpg";
      let name = "cdf42c077fe6037681ae3c003550c2c5";
      let message = `INFO: ${detail} ${url} ${name}`;

      logger.info(detail, url, name);

      expect(consoleInfoSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(processSendStub.calledWith( {
        event: "info",
        event_details: detail,
        error_details: "",
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: name,
        file_url: url
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an error event with no file details", () => {
      let detail = "test error";
      let errorDetails = "exception 1";
      let message = "ERROR: " + detail + " " + errorDetails;
      logger.error(detail, errorDetails);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(processSendStub.calledWith( {
        event: "error",
        event_details: detail,
        error_details: errorDetails,
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: "",
        file_url: ""
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an error event with file details", () => {
      let detail = "test error";
      let errorDetails = "exception 1";
      let url = "http://test.com/image.jpg";
      let name = "cdf42c077fe6037681ae3c003550c2c5";
      let message = `ERROR: ${detail} ${errorDetails} ${url} ${name}`;

      logger.error(detail, errorDetails, url, name);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(processSendStub.calledWith( {
        event: "error",
        event_details: detail,
        error_details: errorDetails,
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: name,
        file_url: url
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log a warn event with no file details", () => {
      let detail = "test warn";
      let message = "WARNING: " + detail;
      logger.warn(detail);

      expect(consoleWarnSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(processSendStub.calledWith({
        event: "warning",
        event_details: detail,
        error_details: "",
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: "",
        file_url: ""
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log a warn event with file details", () => {
      let detail = "test warn";
      let url = "http://test.com/image.jpg";
      let name = "cdf42c077fe6037681ae3c003550c2c5";
      let message = `WARNING: ${detail} ${url} ${name}`;

      logger.warn(detail, url, name);

      expect(consoleWarnSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(processSendStub.calledWith({
        event: "warning",
        event_details: detail,
        error_details: "",
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: name,
        file_url: url
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should handle data type Object for event_details and error_details fields", () => {
      let detail = JSON.stringify({ message: "test error" }),
        errorDetails = JSON.stringify({ message: "exception 1" }),
        message = "ERROR: " + detail + " " + errorDetails;

      logger.error(detail, errorDetails);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.true;

      expect(processSendStub.calledWith( {
        event: "error",
        event_details: detail,
        error_details: errorDetails,
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: "",
        file_url: ""
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;
    });
  });

  describe("No debugging", () => {

    before( function () {
      debugging = false;
      logger = require("../../../../app/helpers/logger/logger")(debugging, fileSystem, displayId, version, os);
      process.send = function(){};
    });

    beforeEach(function () {
      fileSystemAppendToLogSpy = sinon.spy(fileSystem, "appendToLog");
      consoleInfoSpy = sinon.spy(console, "info");
      consoleErrorSpy = sinon.spy(console, "error");
      consoleWarnSpy = sinon.spy(console, "warn");
      processSendStub = sinon.stub(process, "send");
    });

    afterEach(function () {
      fileSystemAppendToLogSpy.restore();
      consoleInfoSpy.restore();
      consoleErrorSpy.restore();
      consoleWarnSpy.restore();
      processSendStub.restore();
    });

    it("should log an info event", () => {
      let detail = "test info";
      let message = "INFO: " + detail;
      logger.info(detail);

      expect(consoleInfoSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(processSendStub.calledWith( {
        event: "info",
        event_details: detail,
        error_details: "",
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: "",
        file_url: ""
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an error event", () => {
      let detail = "test error";
      let errorDetails = "exception 1";
      let message = "ERROR: " + detail + " " + errorDetails;
      logger.error(detail, errorDetails);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(processSendStub.calledWith( {
        event: "error",
        event_details: detail,
        error_details: errorDetails,
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: "",
        file_url: ""
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log a warn event", () => {
      let detail = "test warn";
      let message = "WARNING: " + detail;
      logger.warn(detail);

      expect(consoleWarnSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(processSendStub.calledWith({
        event: "warning",
        event_details: detail,
        error_details: "",
        display_id: displayId,
        cache_version: version,
        os: os,
        file_name: "",
        file_url: ""
      } )).to.be.true;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });
  });

  describe("No debugging and no log to player", () => {

    before( function () {
      debugging = false;
      process.send = undefined;
      logger = require("../../../../app/helpers/logger/logger")(debugging, fileSystem, displayId, version, os);
    });

    beforeEach(function () {
      fileSystemAppendToLogSpy = sinon.spy(fileSystem, "appendToLog");
      consoleInfoSpy = sinon.spy(console, "info");
      consoleErrorSpy = sinon.spy(console, "error");
      consoleWarnSpy = sinon.spy(console, "warn");
    });

    afterEach(function () {
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

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log an error event", () => {
      let detail = "test error";
      let errorDetails = "exception 1";
      let message = "ERROR: " + detail + " " + errorDetails;
      logger.error(detail, errorDetails);

      expect(consoleErrorSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });

    it("should log a warn event", () => {
      let detail = "test warn";
      let message = "WARNING: " + detail;
      logger.warn(detail);

      expect(consoleWarnSpy.calledWith(dateString + " - " + message)).to.be.false;

      expect(fileSystemAppendToLogSpy.calledWith(dateString, message)).to.be.true;

    });
  });

});