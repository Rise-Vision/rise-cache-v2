"use strict";

const fs = require("fs"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  chai = require("chai"),
  expect = chai.expect,
  config = require("../../../config/config"),
  CleanupJob = require("../../../app/jobs/cleanup"),
  Database = require("../../../app/database");

describe("Delete unused files", () => {
  let cleanupJob, spy;
  let logger = {
    info: function (x){},
    error:function (x){},
    warn: function (x){}
  };

  beforeEach(function () {
    let now = new Date();
    let timeToDeleteData = new Date();
    timeToDeleteData = timeToDeleteData.getTime();
    spy = sinon.spy(logger, "info");

    now.setDate(now.getDate() - 7);

    mock({
      [config.cachePath]: {
        "cdf42c077fe6037681ae3c003550c2c5": mock.file({
          content: "some content",
          atime: now
        }),
        "b34eef8aad3ef65c4bde4b8dcdd203c3": mock.file({
          content: "some content",
          atime: new Date()
        })
      },
      [config.headersDBPath]: "",
      [config.metadataDBPath]: "",
      [config.financialDBPath]: '{"key":"risefinancial_realtime_HXXHCTR5AQFQ_-Kn5MaUE2cpYN-FCQSOU_1M_","value":"","_id":"8MBqZbqNaf9nHi8S","createdAt":{"$$date":1501610701895},"updatedAt":{"$$date":1501524301895}}',
      [config.spreadsheetsDBPath]: '{"key":"risesheet_1-jKb73cz20aXzlDxViC8DLclNDeRi8_UmwdGSa260vs_Holiday","value":"","_id":"DUp7nQTRLMp2z8gX","createdAt":{"$$date":1501610700165},"updatedAt":{"$$date":1501524301895}}',
      [config.rssDBPath]: '{"key":"﻿riserss_aHR0cHMlMjUzQSUyRiUyRnd3dy5uYXNhLmdvdiUyRnJzcyUyRmR5biUyRmJyZWFraW5nX25ld3MucnNz_10","value":"","_id":"8MBqZbqNaf9nHi8S","createdAt":{"$$date":1501610701895},"updatedAt":{"$$date":1501524301895}}'
    });

    let headerDB = new Database(config.headersDBPath);
    let metadataDB = new Database(config.metadataDBPath);
    let financialDB = new Database(config.financialDBPath);
    let spreadsheetDB = new Database(config.spreadsheetsDBPath);
    let rssDB = new Database(config.rssDBPath);

    cleanupJob = new CleanupJob(config, headerDB.db, metadataDB.db, financialDB.db, spreadsheetDB.db, rssDB.db, logger);
    cleanupJob.header.set("key", "cdf42c077fe6037681ae3c003550c2c5");
    cleanupJob.header.save((err, obj) => {

      cleanupJob.header.set("key", "b34eef8aad3ef65c4bde4b8dcdd203c3");
      cleanupJob.header.save((err, obj) => {});

    });

    cleanupJob.metadata.set("key", "cdf42c077fe6037681ae3c003550c2c5");
    cleanupJob.metadata.save((err, obj) => {

      cleanupJob.metadata.set("key", "b34eef8aad3ef65c4bde4b8dcdd203c3");
      cleanupJob.metadata.save((err, obj) => {});

    });

    cleanupJob.run();

  });

  afterEach(function () {
    spy.restore();
    mock.restore();
  });

  it("should delete file that has not been accessed within the last 7 days", (done) => {
    // Wait for file to be deleted before running test.
    setTimeout(function() {
      fs.stat(config.cachePath + "/" + "cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
        expect(stats).to.be.undefined;
        expect(err).to.not.be.null;
        expect(err.code).to.equal("ENOENT");  // No such file or directory.

        done();
      });
    }, 200);
  });

  it("should delete file headers that has not been accessed within the last 7 days", (done) => {
    // Wait for file to be deleted before running test.
    setTimeout(function() {
      cleanupJob.header.findByKey("cdf42c077fe6037681ae3c003550c2c5", (err, foundHeader) => {
        expect(Object.keys(foundHeader.data).length).to.equal(0);

        done();
      })
    }, 200);
  });

  it("should delete file metadata that has not been accessed within the last 7 days", (done) => {
    // Wait for file to be deleted before running test.
    setTimeout(function() {
      cleanupJob.metadata.findByKey("cdf42c077fe6037681ae3c003550c2c5", (err, foundMetadata) => {
        expect(Object.keys(foundMetadata.data).length).to.equal(0);

        done();
      })
    }, 200);
  });

  it("should delete financial data that has not been accessed within the last 24 hours", (done) => {
    // Wait for file to be deleted before running test.
    setTimeout(function() {
      cleanupJob.financial.findByKey("risefinancial_realtime_HXXHCTR5AQFQ_-Kn5MaUE2cpYN-FCQSOU_1M_", (err, foundFinancial) => {
        expect(Object.keys(foundFinancial.data).length).to.equal(0);

        done();
      })
    }, 200);
  });

  it("should delete spreadsheet data that has not been accessed within the last 24 hours", (done) => {
    // Wait for file to be deleted before running test.
    setTimeout(function() {
      cleanupJob.spreadsheet.findByKey("risesheet_1-jKb73cz20aXzlDxViC8DLclNDeRi8_UmwdGSa260vs_Holiday", (err, foundSpreadsheet) => {
        expect(Object.keys(foundSpreadsheet.data).length).to.equal(0);

        done();
      })
    }, 200);
  });

  it("should delete rss data that has not been accessed within the last 24 hours", (done) => {
    // Wait for file to be deleted before running test.
    setTimeout(function() {
      cleanupJob.rss.findByKey("﻿riserss_aHR0cHMlMjUzQSUyRiUyRnd3dy5uYXNhLmdvdiUyRnJzcyUyRmR5biUyRmJyZWFraW5nX25ld3MucnNz_10", (err, foundRss) => {
        expect(Object.keys(foundRss.data).length).to.equal(0);

        done();
      })
    }, 200);
  });

  it("should not delete file that has been accessed within the last 7 days", (done) => {
    setTimeout(function() {
      fs.stat(config.cachePath + "/" + "b34eef8aad3ef65c4bde4b8dcdd203c3", (err, stats) => {
        expect(err).to.be.null;
        expect(stats).to.not.be.undefined;

        done();
      });
    }, 200);
  });

  it("should not delete file headers that has been accessed within the last 7 days", (done) => {

    setTimeout(function() {
      cleanupJob.header.findByKey("b34eef8aad3ef65c4bde4b8dcdd203c3", (err, foundHeader) => {
        expect(foundHeader.data.key).to.equal("b34eef8aad3ef65c4bde4b8dcdd203c3");

        done();
      })
    }, 200);
  });

  it("should not delete file metadata that has been accessed within the last 7 days", (done) => {

    setTimeout(function() {
      cleanupJob.metadata.findByKey("b34eef8aad3ef65c4bde4b8dcdd203c3", (err, foundMetadata) => {
        expect(foundMetadata.data.key).to.equal("b34eef8aad3ef65c4bde4b8dcdd203c3");

        done();
      })
    }, 200);
  });

  describe("Logging", () => {

    it("should log info when Financial data deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(2).args[0]).to.equal("Financial data deleted");
        expect(spy.getCall(2).args[1]).to.equal("risefinancial_realtime_HXXHCTR5AQFQ_-Kn5MaUE2cpYN-FCQSOU_1M_");

        done();
      }, 200);
    });

    it("should log info when Spreadsheet data deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(3).args[0]).to.equal("Spreadsheet data deleted");
        expect(spy.getCall(3).args[1]).to.equal("risesheet_1-jKb73cz20aXzlDxViC8DLclNDeRi8_UmwdGSa260vs_Holiday");
        done();
      }, 200);
    });

    it("should log info when Rss data deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(4).args[0]).to.equal("Rss data deleted");
        expect(spy.getCall(4).args[1]).to.equal("﻿riserss_aHR0cHMlMjUzQSUyRiUyRnd3dy5uYXNhLmdvdiUyRnJzcyUyRmR5biUyRmJyZWFraW5nX25ld3MucnNz_10");
        done();
      }, 200);
    });


    it("should log info when cleanup job starts", (done) => {
      setTimeout(function() {
        expect(spy.getCall(0).args[0]).to.equal("Cleanup job started");

        done();
      }, 200);
    });

    it("should log info when file deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(1).args[0]).to.equal("File deleted");
        expect(spy.getCall(1).args[1]).to.be.string;
        expect(spy.getCall(1).args[1]).to.not.be.empty;
        expect(spy.getCall(1).args[2]).to.equal("cdf42c077fe6037681ae3c003550c2c5");

        done();
      }, 200);
    });

    it("should log info when file headers deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(5).args[0]).to.equal("File headers deleted");
        expect(spy.getCall(5).args[1]).to.be.string;
        expect(spy.getCall(5).args[1]).to.not.be.empty;
        expect(spy.getCall(5).args[2]).to.equal("cdf42c077fe6037681ae3c003550c2c5");

        done();
      }, 200);
    });

    it("should log info when file metadata deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(6).args[0]).to.equal("File metadata deleted");
        expect(spy.getCall(6).args[1]).to.be.string;
        expect(spy.getCall(6).args[1]).to.not.be.empty;
        expect(spy.getCall(6).args[2]).to.equal("cdf42c077fe6037681ae3c003550c2c5");

        done();
      }, 200);
    });

    it("should log info when cleanup job ends", (done) => {
      setTimeout(function() {
        expect(spy.getCall(7).args[0]).to.equal("Cleanup job ended");

        done();
      }, 200);
    });

  });

});