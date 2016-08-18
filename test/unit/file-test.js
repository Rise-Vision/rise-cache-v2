"use strict";

const fs = require("fs"),
  chai = require("chai"),
  nock = require("nock"),
  mock = require("mock-fs"),
  config = require("../../config/config"),
  file = require("../../app/controllers/file")(),
  expect = chai.expect;

describe("download", () => {
  beforeEach(() => {
    // Mock the file system.
    mock({
      [config.downloadPath]: {},
      "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
    });

    file.setUrl("http://example.com/logo.png");
  });

  afterEach(() => {
    mock.restore();
    nock.restore();
  });

  it("should save downloaded file to disk with encrypted file name", (done) => {
    nock("http://example.com")
      .get("/logo.png")
      .replyWithFile(200, "/data/logo.png");

    file.download((err, statusCode) => {
      const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
        expect(err).to.be.null;
        expect(stats).to.not.be.null;
        expect(stats.isFile()).to.be.true;

        done();
      });
    });
  });

  it("should return error if file not found", (done) => {
    nock("http://example.com")
      .get("/logo.png")
      .reply(404);

    file.download((err, statusCode) => {
      expect(err).to.not.be.null;
      expect(err.message).to.equal("Invalid url parameter", "error message");
      expect(statusCode).to.equal(404, "status code");

      done();
    });
  });

  it("should not save file if there's an error", (done) => {
    nock("http://example.com")
      .get("/logo.png")
      .reply(404);

    file.download((err, statusCode) => {
      const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
        expect(err).to.not.be.null;
        expect(stats).to.be.undefined;

        done();
      });
    });
  });

});