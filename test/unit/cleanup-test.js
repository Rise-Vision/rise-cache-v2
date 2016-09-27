"use strict";

const fs = require("fs"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  chai = require("chai"),
  expect = chai.expect,
  config = require("../../config/config"),
  CleanupJob = require("../../app/jobs/cleanup"),
  Database = require("../../app/database"),
  Header = require("../../app/models/header"),
  Metadata = require("../../app/models/metadata");

describe("Delete unused files", () => {
  let cleanupJob, spy;
  let logger = {
    info: function (x){},
    error:function (x){},
    warn: function (x){}
  };

  beforeEach(function () {
    let now = new Date();

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
      [config.metadataDBPath]: ""
    });

    let headerDB = new Database(config.headersDBPath);
    let metadataDB = new Database(config.metadataDBPath);

    cleanupJob = new CleanupJob(config, headerDB.db, metadataDB.db, logger);
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

    it("should log info when cleanup job starts", (done) => {
      setTimeout(function() {
        expect(spy.getCall(0).args[0]).to.include("Cleanup job started at ");

        done();
      }, 200);
    });

    it("should log info when file deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(1).args[0]).to.equal("File deleted");

        done();
      }, 200);
    });

    it("should log info when file headers deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(2).args[0]).to.equal("File headers deleted");

        done();
      }, 200);
    });

    it("should log info when file metadata deleted", (done) => {
      setTimeout(function() {
        expect(spy.getCall(3).args[0]).to.equal("File metadata deleted");

        done();
      }, 200);
    });

    it("should log info when cleanup job ends", (done) => {
      setTimeout(function() {
        expect(spy.getCall(4).args[0]).to.include("Cleanup job ended at ");

        done();
      }, 200);
    });

  });

});