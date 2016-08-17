"use strict";

const fs = require("fs"),
  chai = require("chai"),
  nock = require("nock"),
  mock = require("mock-fs"),
  config = require("../../config/config"),
  file = require("../../app/controllers/file")("http://example.com/logo.png"),
  expect = chai.expect;

describe("download", () => {
  before(() => {
    // Mock the file system.
    mock({
      [config.downloadPath]: {},
      "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
    });
  });

  after(() => {
    mock.restore();
  });

  it("should save downloaded file to disk with encrypted file name", () => {
    nock("http://example.com")
      .get("/logo.png")
      .replyWithFile(200, "/data/logo.png");

    file.download((err, statusCode) => {
      const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
        expect(err).to.be.null;
        expect(stats).to.not.be.null;
        expect(stats.isFile()).to.be.true;
      });
    });
  });

  it("should return error if file not found", () => {
    nock("http://example.com")
      .get("/logo.png")
      .reply(404);

    file.download((err, statusCode) => {
      expect(err).to.not.be.null;
      expect(err.message).to.equal("Invalid url parameter", "error message");
      expect(statusCode).to.equal(404, "status code");
    });
  });

  it("should return error if file server responds with an error", () => {
    nock("http://example.com")
      .get("/logo.png")
      .replyWithError("Something bad happened");

    file.download((err) => {
      expect(err).to.not.be.null;
      expect(err.message).to.equal("Something bad happened", "error message");
    });
  });

  it("should return error if file could not be written", () => {
    // Mock the file system without the download directory.
    mock({
      "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
    });

    nock("http://example.com")
      .get("/logo.png")
      .replyWithFile(200, "/data/logo.png");

    file.download((err) => {
      expect(err).to.not.be.null;
      expect(err.errno).to.equal(34, "error number");
    });
  });

  it("should not save file if there's an error", () => {
    nock("http://example.com")
      .get("/logo.png")
      .reply(404);

    file.download((err, statusCode) => {
      const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
        expect(err).to.not.be.null;
        expect(stats).to.be.undefined;
      });
    });
  });

});