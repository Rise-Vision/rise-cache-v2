"use strict";

const fs = require("fs"),
  mock = require("mock-fs"),
  chai = require("chai"),
  fileSystem = require("../../app/helpers/file-system"),
  config = require("../../config/config"),
  expect = chai.expect;

describe("fileExists", () => {

  it("should return true if file exists", () => {
    mock({
      "test": {
        "file.txt": "some content"
      }
    });

    fileSystem.fileExists("test/file.txt", (exists) => {
      expect(exists).to.be.true;

      mock.restore();
    });
  });

  it("should return false if file does not exist", () => {
    fileSystem.fileExists("test/file.txt", (exists) => {
      expect(exists).to.be.false;
    });
  });

});

describe("move", () => {

  it("should move file", () => {
    mock({
      "from": {
        "file.txt": "some content"
      },
      "to": {}
    });

    fileSystem.move("from/file.txt", "to/file.txt", (err) => {
      expect(err).to.be.null;
      fileSystem.fileExists("to/file.txt", (exists) => {
        expect(exists).to.be.true;
        mock.restore();
      });
    });
  });

  it("should replace file", () => {
    let newContent = "some content";
    mock({
      "from": {
        "file.txt": newContent
      },
      "to": {
        "file.txt": "another content"
      }
    });

    fileSystem.move("from/file.txt", "to/file.txt", (err) => {
      expect(err).to.be.null;

      fs.readFile("to/file.txt", 'utf8', function(err, contents) {
        expect(contents).to.equal(newContent);
        mock.restore();
      });
    });
  });

});

describe("getFileName", () => {

  it("should return an encoded file name given a url", () => {
    expect(fileSystem.getFileName("http://example.com/logo.png")).to.equal("cdf42c077fe6037681ae3c003550c2c5");
  });

  it("should return an empty string if no url provided", () => {
    expect(fileSystem.getFileName()).to.equal("");
  });

});

describe("getPathInDownload", () => {

  it("should return the path given a url", () => {
    expect(fileSystem.getPathInDownload("http://example.com/logo.png"))
      .to.equal(config.downloadPath + "/" + "cdf42c077fe6037681ae3c003550c2c5");
  });

});

describe("getPathInCache", () => {

  it("should return the path given a url", () => {
    expect(fileSystem.getPathInCache("http://example.com/logo.png"))
      .to.equal(config.cachePath + "/" + "cdf42c077fe6037681ae3c003550c2c5");
  });

});