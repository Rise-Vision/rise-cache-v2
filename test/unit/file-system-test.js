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

describe("delete", () => {

  it("should delete a file", (done) => {
    mock({
      "test": {
        "file.txt": "some content"
      }
    });

    fileSystem.delete("test/file.txt", (err) => {

      fs.stat("test/file.txt", (err, stats) => {
        expect(stats).to.be.undefined;
        expect(err).to.not.be.null;
        expect(err.code).to.equal("ENOENT");  // No such file or directory.

        mock.restore();
        done();
      });

    });

  });

  it("should return an error if file could not be deleted", (done) => {
    fileSystem.delete("test/file.txt", (err) => {
      expect(err).to.not.be.null;
      expect(err.code).to.equal("ENOENT");  // No such file or directory.

      done();
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

describe("getAccessTime", () => {

  it("should return the access time of a file", (done) => {
    let now = new Date();

    mock({
      [config.cachePath]: {
        "cdf42c077fe6037681ae3c003550c2c5": mock.file({
          content: "some content",
          atime: now
        })
      }
    });

    fileSystem.getAccessTime(config.cachePath + "/" + "cdf42c077fe6037681ae3c003550c2c5", (accessTime) => {
      expect(accessTime).to.equal(now);

      mock.restore();
      done();
    });
  });

  it("should return null if the file does not exist", (done) => {
    fileSystem.getAccessTime(config.cachePath + "/" + "cdf42c077fe6037681ae3c003550c2c5", (accessTime) => {
      expect(accessTime).to.be.null;

      done();
    });
  });

});

describe("isCached", () => {

  it("should return true if file is found in the cache folder", (done) => {
    mock({
      [config.cachePath]: {
        "cdf42c077fe6037681ae3c003550c2c5": "some content"
      }
    });

    fileSystem.isCached("http://example.com/logo.png", (isCached) => {
      expect(isCached).to.be.true;

      mock.restore();
      done();
    });
  });

  it("should return false if file is not found in the cache folder", (done) => {
    fileSystem.isCached("http://example.com/logo.png", (isCached) => {
      expect(isCached).to.be.false;

      done();
    });
  });

});

describe("isDownloading", () => {

  it("should return true if file is found in the download folder", (done) => {
    mock({
      [config.downloadPath]: {
        "cdf42c077fe6037681ae3c003550c2c5": "some content"
      }
    });

    fileSystem.isDownloading("http://example.com/logo.png", (isDownloading) => {
      expect(isDownloading).to.be.true;

      mock.restore();
      done();
    });
  });

  it("should return false if file is not found in the download folder", (done) => {
    fileSystem.isDownloading("http://example.com/logo.png", (isDownloading) => {
      expect(isDownloading).to.be.false;

      done();
    });
  });

});

describe("isUnused", () => {

  it("should return true if a file has not been accessed within the last 7 days", (done) => {
    let now = new Date();

    now.setDate(now.getDate() - 7);

    mock({
      [config.cachePath]: {
        "cdf42c077fe6037681ae3c003550c2c5": mock.file({
          content: "some content",
          atime: now
        })
      }
    });

    fileSystem.isUnused(config.cachePath + "/" + "cdf42c077fe6037681ae3c003550c2c5", (isUnused) => {
      expect(isUnused).to.be.true;

      done();
    });
  });

  it("should return false if a file has been accessed within the last 7 days", (done) => {
    mock({
      [config.cachePath]: {
        "cdf42c077fe6037681ae3c003550c2c5": mock.file({
          content: "some content",
          atime: new Date()
        })
      }
    });

    fileSystem.isUnused(config.cachePath + "/" + "cdf42c077fe6037681ae3c003550c2c5", (isUnused) => {
      expect(isUnused).to.be.false;

      done();
    });
  });

});