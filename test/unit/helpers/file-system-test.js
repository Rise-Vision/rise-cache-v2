"use strict";

const fs = require("fs"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  chai = require("chai"),
  fileSystem = require("../../../app/helpers/file-system"),
  config = require("../../../config/config"),
  expect = chai.expect;

global.DOWNLOAD_TOTAL_SIZE = 0;
global.PROCESSING_LIST = new Set();
global.UNAVAILABLE_SPACE_LIST = new Set();

let logger = {
  error: function (detail, errorDetail) {},
  info: function (detail, errorDetail) {}
};

  describe("fileExists", () => {

  after(function () {
    mock.restore();
  });

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

  it("should return an encoded file name given a storage googleapis url", () => {
    expect(fileSystem.getFileName("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/rodrigo/test.jpg")).to.equal("706f06b62284d45f46fbde678bcafbae");
  });

  it("should return an encoded file name given a googleapis url", () => {
    expect(fileSystem.getFileName("https://www.googleapis.com/storage/v1/b/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/o/rodrigo%2Ftest.jpg")).to.equal("706f06b62284d45f46fbde678bcafbae");
  });

  it("should return an encoded file name given a storage api url", () => {
    expect(fileSystem.getFileName("https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013&file=rodrigo%2Ftest.jpg")).to.equal("706f06b62284d45f46fbde678bcafbae");
  });

  it("should return an encoded file name given a storage api url for folder", () => {
    expect(fileSystem.getFileName("https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013&folder=rodrigo%2F")).to.equal("e60886d7eab5d0affdbf2207d2a4a2f2");
  });

  it("should return an encoded file name given a financial production server url", () => {
    expect(fileSystem.getFileName("https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")).to.equal("cba6ed829709ed54b1079ae215a8658d");
  });

  it("should return an encoded file name given a financial test server url", () => {
    expect(fileSystem.getFileName("https://contentfinancial2-test.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")).to.equal("cba6ed829709ed54b1079ae215a8658d");
  });

  it("should return same encoded file name given an url for getting the file metadata or for getting the file", () => {
    let forFile = fileSystem.getFileName("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/rodrigo/test.jpg");
    let forMetadata = fileSystem.getFileName("https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013&file=rodrigo%2Ftest.jpg");

    expect(forFile).to.equal(forMetadata);
  });

  it("should return same encoded file name given an url was escaped or not", () => {
    let notEscaped = fileSystem.getFileName("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/rodrigo/test.jpg");
    let escaped = fileSystem.getFileName("https://storage.googleapis.com/risemedialibrary-30007b45-3df0-4c7b-9f7f-7d8ce6443013/rodrigo%2Ftest.jpg");

    expect(notEscaped).to.equal(escaped);
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
      expect(accessTime.toDateString()).to.equal(now.toDateString());

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

})

describe("appendToLog", () => {

  it("should append to log", (done) => {
    let date = "1969/12/31 21:00:00";
    let message = "ERROR: test error exception 1";

    mock({
      [config.logFilePath]: ""
    });

    fileSystem.appendToLog(date, message);

    fs.readFile(config.logFilePath, 'utf8', function(err, contents) {
      expect(contents).to.equal("1969/12/31 21:00:00 - ERROR: test error exception 1\n");
      mock.restore()
      done();
    });

  });
});

describe("cleanupLogFile", () => {
  const logger = {
    info: function (detail) {},
    error: function (detail, errorDetail) {},
    warn: function (detail) {}
  };

  it("should clean up log", (done) => {

    mock({
      [config.logFilePath]: "2016/09/22 12:12:01 - INFO: Rise Cache is up and running on port: 9494"
    });

    fileSystem.cleanupLogFile(logger);

    fs.readFile(config.logFilePath, 'utf8', function(err, contents) {
      expect(contents).to.equal("");
      mock.restore()
      done();
    });

  });

  it("should not log error if file does not exist", (done) => {
    let spy = sinon.spy(logger, "error");

    fileSystem.cleanupLogFile(logger);

    setTimeout(function() {
      expect(spy.callCount).to.equal(0);
      logger.error.restore();
      done();
    }, 200);
  });

  it("should log an error if the log could not be cleaned up", (done) => {
    let spy = sinon.spy(logger, "error");

    mock({
      [config.logFilePath]: null
    });

    fileSystem.cleanupLogFile(logger);

    setTimeout(function() {
      expect(spy.callCount).to.equal(1);
      logger.error.restore();
      done();
    }, 200);

  });

});

describe("available space", () => {
  let oneGB = 1024*1024*1024,
      fiveHundredTwelveMB = 512*1024*1024,
      threeHundredMB = 300*1024*1024;

  it("should return available space true when passing no fileSize and there is space in disk", (done) => {
    fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
      expect(isThereAvailableSpace).to.be.true;
      done();
    }, oneGB);
  });

  it("should return available space true when passing no fileSize and there is space in disk even though a file is being downloaded", (done) => {

    fileSystem.addToDownloadTotalSize(threeHundredMB); // 500MB

    fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
      expect(isThereAvailableSpace).to.be.true;

      fileSystem.removeFromDownloadTotalSize(threeHundredMB); // 500MB
      done();
    }, oneGB);
  });

  it("should return available space false when passing no fileSize and there is no space in disk", (done) => {

    fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
      expect(isThereAvailableSpace).to.be.false;
      done();
    },fiveHundredTwelveMB);
  });

  it("should return available space false when passing no fileSize and there is no space in disk when downloading a file", (done) => {

    fileSystem.addToDownloadTotalSize(fiveHundredTwelveMB); // 512MB

    fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
      expect(isThereAvailableSpace).to.be.false;
      fileSystem.removeFromDownloadTotalSize(fiveHundredTwelveMB); // 512MB
      done();
    },oneGB);
  });

  it("should return available space false when passing fileSize and there is no space in disk", (done) => {

    fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
      expect(isThereAvailableSpace).to.be.false;
      done();
    }, oneGB, fiveHundredTwelveMB);
  });

  it("should return available space true when passing fileSize and there is space in disk", (done) => {

    fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
      expect(isThereAvailableSpace).to.be.true;
      done();
    }, oneGB, threeHundredMB);
  });

  it("should return available space false when passing fileSize and there is space in disk but it is downloading", (done) => {

    fileSystem.addToDownloadTotalSize(threeHundredMB);

    fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
      expect(isThereAvailableSpace).to.be.false;

      fileSystem.removeFromDownloadTotalSize(threeHundredMB);
      done();
    }, oneGB, fiveHundredTwelveMB);
  });
});

describe("isProcessing", () => {

  it("should return true if file hash name is found in global processing list", () => {
    global.PROCESSING_LIST = new Set(["abc123", "def456"]);

    expect(fileSystem.isProcessing("abc123")).to.be.true;
  });

  it("should return false if file hash name is not found in global processing list", () => {
    global.PROCESSING_LIST = new Set(["def456"]);

    expect(fileSystem.isProcessing("abc123")).to.be.false;
  });

});

describe("addToProcessingList", () => {

  it("should add file hash name to global processing list", () => {
    global.PROCESSING_LIST = new Set(["abc123", "def456"]);

    fileSystem.addToProcessingList("ghi789");

    expect(global.PROCESSING_LIST.has("ghi789")).to.be.true;
  });

  it("should not add file hash name to global processing list if already exists", () => {
    global.PROCESSING_LIST = new Set(["abc123", "def456", "ghi789"]);

    fileSystem.addToProcessingList("def456");

    expect(global.PROCESSING_LIST.size).to.equal(3);
  });

});

describe("removeFromProcessingList", () => {

  it("should remove file hash name from global processing list", () => {
    global.PROCESSING_LIST = new Set(["abc123", "def456"]);

    fileSystem.removeFromProcessingList("abc123");

    expect(global.PROCESSING_LIST.size).to.equal(1);
  });

});

describe("hasNoAvailableSpace", () => {

  it("should return true if file hash name is found in global unavailable space list", () => {
    global.UNAVAILABLE_SPACE_LIST = new Set(["abc123", "def456"]);

    expect(fileSystem.hasNoAvailableSpace("abc123")).to.be.true;
  });

  it("should return false if file hash name is not found in global unavailable space list", () => {
    global.UNAVAILABLE_SPACE_LIST = new Set(["def456"]);

    expect(fileSystem.hasNoAvailableSpace("abc123")).to.be.false;
  });

});

describe("addToUnavailableSpaceList", () => {

  it("should add file hash name to global unavailable space  list", () => {
    global.UNAVAILABLE_SPACE_LIST = new Set(["abc123", "def456"]);

    fileSystem.addToUnavailableSpaceList("ghi789");

    expect(global.UNAVAILABLE_SPACE_LIST.has("ghi789")).to.be.true;
  });

  it("should not add file hash name to global unavailable space  list if already exists", () => {
    global.UNAVAILABLE_SPACE_LIST = new Set(["abc123", "def456", "ghi789"]);

    fileSystem.addToUnavailableSpaceList("def456");

    expect(global.UNAVAILABLE_SPACE_LIST.size).to.equal(3);
  });

});
