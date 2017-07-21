"use strict";

const chai = require("chai"),
  expect = chai.expect,
  sinon = require("sinon");


describe("External Logger", () => {
  let externalLogger;
  let bqClient = {
    insert: function (table, data, date, suffix) { return { catch: function (cb){}}}
  };
  let displayId = "displayIdTest";
  let version = "1.0.0";
  let os = "win32";

  let bqClientInsertSpy, fileSystemAppendToLogSpy;
  let fileSystem = {
    appendToLog : function (logDatetime, message) { return;},
    getFileName: function (url) {return "";}
  };

  before( function () {
    externalLogger = require("../../../../app/helpers/logger/external-logger-bigquery")(bqClient, displayId, version, os, fileSystem);
  });

  beforeEach(function () {
    fileSystemAppendToLogSpy = sinon.spy(fileSystem, "appendToLog");
    bqClientInsertSpy = sinon.spy(bqClient, "insert");
  });

  afterEach(function () {
    bqClientInsertSpy.restore();
    fileSystemAppendToLogSpy.restore();
  });

  it("should log an event to BQ", () => {
    let date = new Date("09/20/2016");
    let data = {
      event: "info",
      event_details: "Test Info" || "",
      error_details: "",
      display_id: displayId,
      cache_version: version,
      os: os,
      ts: date.toISOString(),
      file_url: "",
      file_name: ""
    };

    externalLogger.log(data.event, data.event_details, undefined, undefined, data.error_details, date);

    expect(bqClientInsertSpy.calledWith("events", data, date, "20160920")).to.be.true;

  });

  it("should return an error if event name is not defined", (done) => {
    let date = new Date("09/20/2016");

    externalLogger.log("", "Test Info", "", date).catch((e)=> {
      expect(e).to.equal("eventName is required");
      expect(bqClientInsertSpy.called).to.be.false;
      done();
    });

  });

  it("should log error to insert to BQ", (done) => {
    bqClient.insert = function () {

      return Promise.reject('this promise will always be rejected');
    }
    bqClientInsertSpy = sinon.spy(bqClient, "insert");

    let date = new Date("09/20/2016");
    let data = {
      event: "info",
      event_details: "Test Info" || "",
      error_details: "",
      display_id: displayId,
      cache_version: version,
      os: os,
      ts: date.toISOString(),
      file_url: "",
      file_name: ""
    };
    let logDatetime = "logDatetime";

    externalLogger.log(data.event, data.event_details, undefined, undefined, data.error_details, date, logDatetime);

    expect(bqClientInsertSpy.calledWith("events", data, date, "20160920")).to.be.true;

    let expectedMessage = "Could not log to bq 'this promise will always be rejected'";
    setTimeout(function () {
      expect(fileSystemAppendToLogSpy.calledWith(logDatetime, expectedMessage)).to.be.true;
      done();
    },100);
  });

});