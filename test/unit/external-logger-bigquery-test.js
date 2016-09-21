"use strict";

const chai = require("chai"),
  expect = chai.expect,
  sinon = require("sinon");


describe("External Logger", () => {
  let externalLogger;
  let bqClient = {
    insert: function (table, data, date, suffix) { return { catch: function (){}}}
  };
  let displayId = "displayIdTest";
  let version = "1.0.0";
  let os = "win32";

  let bqClientInsertSpy;

  before( function () {
    externalLogger = require("../../app/helpers/logger/external-logger-bigquery")(bqClient, displayId, version, os);
  });

  beforeEach(function () {
    bqClientInsertSpy = sinon.spy(bqClient, "insert");
  });

  afterEach(function () {
    bqClientInsertSpy.restore();
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
      ts: date.toISOString()
    };

    externalLogger.log(data.event, data.event_details, data.error_details, date);

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

});