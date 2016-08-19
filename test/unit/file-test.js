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
  let fileController;

  beforeEach(() => {
    fileController = new FileController("http://example.com/logo.png",
      config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5");
  });

  describe("downloadFile", () => {

    beforeEach(() => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    afterEach(() => {
      mock.restore();
    });

    after(() => {
      nock.restore();
    });

    it("should save downloaded file to disk with encrypted file name", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      fileController.downloadFile();

      fileController.on("downloaded", () => {
        const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
          expect(err).to.be.null;
          expect(stats).to.not.be.null;
          expect(stats.isFile()).to.be.true;

          done();
        });
      });
    });

    it("should fire a stream event", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      fileController.downloadFile();

      fileController.on("stream", (resFromDownload) => {
        expect(resFromDownload.statusCode).to.equal(200, "status code");
        done();
      });
    });

    it("should return error if file not found", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .reply(404);

      fileController.downloadFile();

      fileController.on("stream", (resFromDownload) => {
        expect(resFromDownload.statusCode).to.equal(404, "status code");
        done();
      });
    });

    it("should not save file if there's an error", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .reply(404);

      fileController.downloadFile();

      fileController.on("stream", (resFromDownload) => {
        const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
          expect(err).to.not.be.null;
          expect(stats).to.be.undefined;

          done();
        });
      });
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
        [config.downloadPath]: {
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
        [config.downloadPath]: {
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

});