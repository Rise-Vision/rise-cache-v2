"use strict";

const fs = require("fs"),
  chai = require("chai"),
  nock = require("nock"),
  mock = require("mock-fs"),
  config = require("../../config/config"),
  FileController = require("../../app/controllers/file"),
  expect = chai.expect;

describe("download", () => {
  let fileController;
  beforeEach(() => {
    // Mock the file system.
    mock({
      [config.downloadPath]: {},
      "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
    });

    fileController = new FileController("http://example.com/logo.png");
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

    fileController.download();

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

    fileController.download();

    fileController.on("stream", (resFromDownload) => {
      expect(resFromDownload.statusCode).to.equal(200, "status code");
      done();
    });
  });

  it("should return error if file not found", (done) => {
    nock("http://example.com")
      .get("/logo.png")
      .reply(404);

    fileController.download();

    fileController.on("stream", (resFromDownload) => {
      expect(resFromDownload.statusCode).to.equal(404, "status code");
      done();
    });
  });

  it("should not save file if there's an error", (done) => {
    nock("http://example.com")
      .get("/logo.png")
      .reply(404);

    fileController.download();

    fileController.on("stream", (resFromDownload) => {
      const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
        expect(err).to.not.be.null;
        expect(stats).to.be.undefined;

        done();
      });
    });
  });

});