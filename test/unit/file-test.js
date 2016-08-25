"use strict";

const fs = require("fs"),
  chai = require("chai"),
  nock = require("nock"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  config = require("../../config/config"),
  FileController = require("../../app/controllers/file"),
  expect = chai.expect;

describe("FileController", () => {
  let fileController,
    header = {
      save: function () {
        return;
      },
      set: function () {

      }
    };

  beforeEach(() => {
    fileController = new FileController("http://example.com/logo.png", header);
  });

  describe("saveHeaders", () => {

    beforeEach(() => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        [config.cachePath]: {},
        [config.headersDBPath]: "",
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    afterEach(() => {
      mock.restore();
    });

    after(() => {
      nock.restore();
    });

    it("should not set key if there is already headers for it on db", () => {
      header = {
        save: function () {
          return;
        },
        set: function () {

        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      let headerSaveSpy = sinon.spy(header, "save");

      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      fileController.saveHeaders();

      expect(headerSaveSpy.calledOnce).to.be.true;
    });

    it("should emit an error event if an error happens when saving headers", (done) => {
      header = {
        save: function (cb) {
          cb(new Error("ERROR"));
        },
        set: function () {

        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      let headerSaveSpy = sinon.spy(header, "save");

      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      fileController.on("headers-error", (err) => {
        expect(headerSaveSpy.calledOnce).to.be.true;
        expect(err.message).to.equal("ERROR");
        done();
      });

      fileController.saveHeaders();
    });

  });

  describe("readFile", () => {

    afterEach(() => {
      mock.restore();
    });

    it("should emit 'read' event", () => {
      let readSpy = sinon.spy();

      // Mock file system and create file in the download directory.
      mock({
        [config.cachePath]: {
          "cdf42c077fe6037681ae3c003550c2c5": "some content"
        },
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });

      fileController.on("read", readSpy);
      fileController.readFile();

      expect(readSpy.calledOnce).to.be.true;
    });

    it ("should pass the file as an argument to the event listener", () =>  {
      let readSpy = sinon.spy();

      // Mock file system and create file in the download directory.
      mock({
        [config.cachePath]: {
          "cdf42c077fe6037681ae3c003550c2c5": "some content"
        },
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });

      fileController.on("read", readSpy);
      fileController.readFile();

      expect(readSpy.args[0].length).equal(1);
      expect(readSpy.args[0][0]).to.be.an("object");
    });

    it("should emit 'file-error' event if file does not exist", (done) => {
      let errorSpy = sinon.spy(),
        handler;

      handler = (err) => {
        expect(err).to.not.be.null;
        expect(err.code).to.equal("ENOENT");  // No such file or directory.

        fileController.removeListener("file-error", handler);
        done();
      };

      fileController.on("file-error", handler);
      fileController.readFile();
    });

  });

  describe("move from download to cache", () => {

    afterEach(() => {
      mock.restore();
    });

    it("should move file to cache", () => {
      let content = "some content";

      // Mock file system and create file in the download directory.
      mock({
        [config.downloadPath]: {
          "cdf42c077fe6037681ae3c003550c2c5": content
        },
        [config.cachePath]: {
        }
      });

      fileController.moveFileFromDownloadToCache();

      fs.readFile(config.cachePath + "/cdf42c077fe6037681ae3c003550c2c5", 'utf8', function(err, contents) {
        expect(contents).to.equal(content);
      });
    });

    it("should emit an err if there is an error on moving file", () => {

      // Mock file system and create file in the download directory.
      mock({
        [config.downloadPath]: {
        },
        [config.cachePath]: {
        }
      });

      fileController.moveFileFromDownloadToCache();

      fileController.on("file-error", (err) => {
        expect(err).to.not.be.null;
      });
    });
  });

  describe("getHeaders", () => {

    it("should get the headers from DB", (done) => {
      const newHeader = {data: {key: "test", headers: {etag: "etag"}}};
      header = {
        findByKey: function (key, cb) {
          cb(null, newHeader);
        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      let headerFindByKeySpy = sinon.spy(header, "findByKey");

      fileController.getHeaders( (err, headers) => {
        expect(headerFindByKeySpy.calledOnce).to.be.true;
        expect(headers).to.deep.equal(newHeader.data.headers);
        done();
      });
    });

    it("should return an error if there is an error on getting headers from DB", (done) => {
      let errorMessage = "Error getting headers";
      header = {
        findByKey: function (key, cb) {
          cb(new Error(errorMessage));
        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      let headerFindByKeySpy = sinon.spy(header, "findByKey");

      fileController.getHeaders( (err, headers) => {
        expect(headerFindByKeySpy.calledOnce).to.be.true;
        expect(headers).to.be.undefined;
        expect(err.message).to.equal(errorMessage);
        done();
      });
    });

  });

  describe("getTimestampData", () => {

    it("should return an object with timestamp data from DB", (done) => {
      const newHeader = {data: {key: "test", createdAt: 1472140800000, updatedAt: 1472133000000, headers: {etag: "etag"}}};
      header = {
        findByKey: function (key, cb) {
          cb(null, newHeader);
        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      let headerFindByKeySpy = sinon.spy(header, "findByKey");

      fileController.getTimestampData( (err, timestamp) => {
        expect(headerFindByKeySpy.calledOnce).to.be.true;
        expect(timestamp).to.deep.equal({
          createdAt: newHeader.data.createdAt,
          updatedAt: newHeader.data.updatedAt
        });
        done();
      });
    });

    it("should return an error if there is an error on getting timestamp data from DB", (done) => {
      let errorMessage = "Error getting timestamp data";
      header = {
        findByKey: function (key, cb) {
          cb(new Error(errorMessage));
        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      let headerFindByKeySpy = sinon.spy(header, "findByKey");

      fileController.getTimestampData( (err, timestamp) => {
        expect(headerFindByKeySpy.calledOnce).to.be.true;
        expect(timestamp).to.be.undefined;
        expect(err.message).to.equal(errorMessage);
        done();
      });
    });

  });

  describe("isStale", () => {

    let clock, date;

    before(() => {
      date = new Date(1472133600000);
      clock = sinon.useFakeTimers(date.getTime());
    });

    after(() => {
      clock.restore();
    });

    it("should return false when last time checked is less than 20 mins", (done) => {
      // updatedAt is 10 minutes less than current time
      const newHeader = {data: {key: "test", createdAt: 1472140800000, updatedAt: 1472133000000, headers: {etag: "etag"}}};
      header = {
        findByKey: function (key, cb) {
          cb(null, newHeader);
        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      fileController.isStale(config.fileUpdateDuration, (err, stale) => {
        expect(stale).to.be.false;
        done();
      });
    });

    it("should return true when last time checked is more than 20 mins", (done) => {
      // updatedAt is 10 minutes less than current time
      const newHeader = {data: {key: "test", createdAt: 1472140800000, updatedAt: 1472133000000, headers: {etag: "etag"}}};
      header = {
        findByKey: function (key, cb) {
          cb(null, newHeader);
        }
      };

      fileController = new FileController("http://example.com/logo.png", header);

      // tick clock by 15 minutes
      clock.tick(900000);

      fileController.isStale(config.fileUpdateDuration, (err, stale) => {
        expect(stale).to.be.true;
        done();
      });
    });

  });
});