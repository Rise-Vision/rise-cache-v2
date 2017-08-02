"use strict";

const fs = require("fs"),
  chai = require("chai"),
  nock = require("nock"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  config = require("../../../config/config"),
  FileController = require("../../../app/controllers/file"),
  expect = chai.expect,
  httpMocks = require('node-mocks-http'),
  EventEmitter = require("events").EventEmitter,
  fileSystem = require("../../../app/helpers/file-system");

global.DOWNLOAD_TOTAL_SIZE = 0;

fileSystem.createDir(config.cachePath);

describe("FileController", () => {


  let fileController,
    header = {
      save: function () {
        return;
      },
      set: function () {

      }
    };

  let riseDisplayNetworkII = {
    get: function (property) {
      if (property == "activeproxy") {
        return "";
      }
    }
  };

  let logger = {
    error: function (detail, errorDetail) {},
    info: function (detail, errorDetail) {}
  };

  after(() => {
    nock.cleanAll();
    mock.restore();
  });

  beforeEach(() => {
    fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII, logger);
  });

  describe("downloadFile", () => {

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
      nock.cleanAll();
    });

    it("should save downloaded file to disk with encrypted file name", (done) => {
      let headerSaveSpy = sinon.spy(header, "save");

      nock("http://abc123.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png", {
        'Content-length': "10"
      });

      fileController.downloadFile();

      fileController.on("downloaded", () => {
        const stats = fs.stat(config.downloadPath + "/0e36e4d268b63fd0573185fe3a9e01f0", (err, stats) => {
          expect(err).to.be.null;
          expect(stats).to.not.be.null;
          expect(stats.isFile()).to.be.true;
          expect(headerSaveSpy.calledOnce).to.be.true;

          done();
        });
      });
    });

    it("should save downloaded file without RiseDisplayNetworkII.ini file", (done) => {
      let controller = new FileController("http://abc123.com/logo.png", header, null, logger);

      nock("http://abc123.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      controller.downloadFile();

      controller.on("downloaded", () => {
        const stats = fs.stat(config.downloadPath + "/0e36e4d268b63fd0573185fe3a9e01f0", (err, stats) => {
          expect(err).to.be.null;
          expect(stats).to.not.be.null;
          expect(stats.isFile()).to.be.true;

          done();
        });
      });
    });

    it("should emit 'downloaded' event", (done) => {
      nock("http://abc123.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      fileController.downloadFile();

      fileController.on("downloaded", () => {
        expect(true).to.be.true;
        done();
      });
    });

    it("should update timestamp when response is 304", (done) => {
      let header = {
        update: function (field, cb) {
          cb(null, 1);
        },
        set: function () {}
      };

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

      nock("http://abc123.com")
        .get("/logo.png")
        .replyWithFile(304, "/data/logo.png");

      fileController.downloadFile();

      fileController.on("timestamp-updated", (numAffected) => {
        expect(numAffected).to.equal(1);
        done();
      });

    });

    it("should emit 'request-error' event if file server responds with an error", (done) => {
      fileController.downloadFile();

      fileController.on("request-error", (err) => {
        expect(err).to.not.be.null;

        done();
      });
    });

    it("should not emit 'request-error' event if connection delay timeout under 2 minutes", (done) => {

      let spy = sinon.spy(fileController, "deleteFileFromDownload");

      nock("http://abc123.com")
        .get("/logo.png")
        .socketDelay(60000) // 1 min
        .replyWithFile(200, "/data/logo.png");

      fileController.downloadFile();

      fileController.on("downloaded", () => {
        expect(true).to.be.true;
        expect(spy.callCount).to.equal(0);

        fileController.deleteFileFromDownload.restore();

        done();
      });
    });

    it("should emit 'request-error' event if connection timeout surpasses 2 minutes", (done) => {

      let spy = sinon.spy(fileController, "deleteFileFromDownload");

      nock("http://abc123.com")
        .get("/logo.png")
        .socketDelay(180000) // 3 mins
        .replyWithFile(200, "/data/logo.png");

      fileController.downloadFile();

      fileController.on("request-error", (err) => {
        // checking just for ESOCKETTIMEDOUT because a ECONNRESET immediately follows it causing multiple done() calls
        if (err.code === "ESOCKETTIMEDOUT") {
          expect(err).to.not.be.null;
          expect(spy.callCount).to.equal(1);

          fileController.deleteFileFromDownload.restore();

          done();
        }
      });
    });

    it("should delete incomplete file if file server responds with an error", (done) => {

      mock({
        [config.downloadPath]: {
          "0e36e4d268b63fd0573185fe3a9e01f0": "some content"
        }
      });

      fileController.downloadFile();

      fileController.on("request-error", (err) => {
        setTimeout(()=> {
          const stats = fs.stat(config.downloadPath + "/0e36e4d268b63fd0573185fe3a9e01f0", (err, stats) => {
            expect(err).to.not.be.null;
            expect(stats).to.be.undefined;
            done();
          });
        }, 1000)
      });
    });

    it("should emit insufficient-disk-space if there is no available space for downloading the file", (done) => {

      nock("http://abc123.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png", {
          'Content-length': "10000000000000000"
        });

      fileController.downloadFile();

      fileController.on("insufficient-disk-space", (fileSize) => {
        expect(fileSize).to.be.equal("10000000000000000");
        done();
      });
    });

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
      nock.cleanAll();
    });

    it("should not set key if there is already headers for it on db", () => {
      header = {
        save: function () {
          return;
        },
        set: function () {

        }
      };

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

      let headerSaveSpy = sinon.spy(header, "save");

      nock("http://abc123.com")
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

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

      let headerSaveSpy = sinon.spy(header, "save");

      nock("http://abc123.com")
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

  describe("streamFile", () => {
    let res;

    beforeEach(() => {
      res = httpMocks.createResponse({
        eventEmitter: EventEmitter
      });
    });

    afterEach(() => {
      mock.restore();
    });

    it("should stream file content", (done) => {
      let content = "some content";

      let req = httpMocks.createRequest({
        method: "GET",
        url: "/files",
        params: {
          url: "http://example.com/logo.png"
        }
      });

      // Mock file system and create file in the download directory.
      mock({
        [config.cachePath]: {
          "0e36e4d268b63fd0573185fe3a9e01f0": "some content"
        },
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });

      fileController.streamFile(req, res);
      res.on('end', function() {
        expect(res._getData()).to.equal(content);
        done();
      });
    });

    it ("should stream a range of the file content", (done) =>  {

      let req = httpMocks.createRequest({
        method: "GET",
        url: "/files",
        params: {
          url: "http://example.com/logo.png"
        },
        headers: {
          "range": "bytes= 5-12"
        }
      });

      // Mock file system and create file in the download directory.
      mock({
        [config.cachePath]: {
          "0e36e4d268b63fd0573185fe3a9e01f0": "some content"
        },
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });

      fileController.streamFile(req, res);
      res.on('end', function() {
        // Expected to get only the bytes 5-12
        expect(res._getData()).to.be.equal("content");
        done();
      });
    });

    it("should emit 'file-error' event if file does not exist", (done) => {
      let handler;

      let req = httpMocks.createRequest({
        method: "GET",
        url: "/files",
        params: {
          url: "http://example.com/logo.png"
        },
        headers: {
          "range": "bytes= 5-12"
        }
      });

      handler = (err) => {
        expect(err).to.not.be.null;

        fileController.removeListener("file-error", handler);
        done();
      };

      fileController.on("file-error", handler);
      fileController.streamFile(req, res);
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
          "0e36e4d268b63fd0573185fe3a9e01f0": content
        },
        [config.cachePath]: {
        }
      });

      fileController.moveFileFromDownloadToCache();

      fs.readFile(config.cachePath + "/0e36e4d268b63fd0573185fe3a9e01f0", 'utf8', function(err, contents) {
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

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

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

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

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

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

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

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

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

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

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

      fileController = new FileController("http://abc123.com/logo.png", header, riseDisplayNetworkII);

      // tick clock by 15 minutes
      clock.tick(900000);

      fileController.isStale(config.fileUpdateDuration, (err, stale) => {
        expect(stale).to.be.true;
        done();
      });
    });

  });

  describe("getUpdateHeaderField", () => {

    it("should return 'If-None-Match' field when etag exists", (done) => {
      const newHeader = {data: {key: "test", headers: {etag: "etag", "last-modified": "Thu, 25 Aug 2016 14:53:30 GMT"}}};
      header = {
        findByKey: function (key, cb) {
          cb(null, newHeader);
        }
      };

      fileController = new FileController("http://example.com/logo.png", header, riseDisplayNetworkII);

      fileController.getUpdateHeaderField( (err, field) => {
        expect(field).to.deep.equal({
          "If-None-Match": newHeader.data.headers.etag
        });
        done();
      });
    });

    it("should return 'If-Modified-Since' field when etag not present and use last-modified", (done) => {
      const newHeader = {data: {key: "test", headers: {"last-modified": "Thu, 25 Aug 2016 14:53:30 GMT"}}};
      header = {
        findByKey: function (key, cb) {
          cb(null, newHeader);
        }
      };

      fileController = new FileController("http://example.com/logo.png", header, riseDisplayNetworkII);

      fileController.getUpdateHeaderField( (err, field) => {
        expect(field).to.deep.equal({
          "If-Modified-Since": newHeader.data.headers["last-modified"]
        });
        done();
      });
    });

    it("should return an error if there is an error on getting headers from DB", (done) => {
      let errorMessage = "Error getting timestamp data";
      header = {
        findByKey: function (key, cb) {
          cb(new Error(errorMessage));
        }
      };

      fileController = new FileController("http://example.com/logo.png", header, riseDisplayNetworkII);

      fileController.getUpdateHeaderField( (err, field) => {
        expect(field).to.be.undefined;
        expect(err.message).to.equal(errorMessage);
        done();
      });
    });

  });

  describe("isStorageFile", () => {

    it("should return true for url containing 'storage.googleapis.com'", () => {
      let url = "https%3A%2F%2Fstorage.googleapis.com%2Frisemedialibrary-abc123%2Fimages%2Ftest.jpg";
      expect(fileController.isStorageFile(url)).to.be.true;
    });

    it("should return true for url containing 'googleapis.com/storage'", () => {
      let url = "https%3A%2F%2Fwww.googleapis.com%2Fstorage%2Fv1%2Fb%2Frisemedialibrary-abc123%2Fo%2Fimages%2Ftest.jpg?alt=media";
      expect(fileController.isStorageFile(url)).to.be.true;
    });

    it("should return false for non-storage url", () => {
      let url = "http://test.com/images/test.jpg";
      expect(fileController.isStorageFile(url)).to.be.false;
    });

  });

  describe("getUrlWithDisplayID", () => {

    it("should return url with display id as query param", () => {
      let url = "https%3A%2F%2Fstorage.googleapis.com%2Frisemedialibrary-abc123%2Fimages%2Ftest.jpg";
      expect(fileController.getUrlWithDisplayID(url, "ABC123")).to.equal(url + "?displayid=ABC123");
    });

    it("should return url with display id as additional query param", () => {
      let url = "https%3A%2F%2Fwww.googleapis.com%2Fstorage%2Fv1%2Fb%2Frisemedialibrary-abc123%2Fo%2Fimages%2Ftest.jpg?alt=media";
      expect(fileController.getUrlWithDisplayID(url, "ABC123")).to.equal(url + "&displayid=ABC123");
    });


  });
});