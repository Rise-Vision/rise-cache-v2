"use strict";

const fs = require("fs"),
  chai = require("chai"),
  nock = require("nock"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  config = require("../../../config/config"),
  FinancialsController = require("../../../app/controllers/financials"),
  expect = chai.expect,
  httpMocks = require('node-mocks-http'),
  EventEmitter = require("events").EventEmitter,
  fileSystem = require("../../../app/helpers/file-system");

global.DOWNLOAD_TOTAL_SIZE = 0;

fileSystem.createDir(config.cachePath);

describe("FinancialsController", () => {

  let financialsController;

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
    financialsController = new FinancialsController("https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175", riseDisplayNetworkII, logger);
  });

  describe("getData", () => {

    beforeEach(() => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        [config.cachePath]: {}
      });

    });

    afterEach(() => {
      mock.restore();
    });

    after(() => {
      nock.cleanAll();
    });

    it("should save financial server response to disk with encrypted file name", (done) => {
      nock("https://contentfinancial2.appspot.com")
        .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
        .reply(200, "Financial data!", {
          'Content-length': "10"
        });

      financialsController.getData();

      financialsController.on("saved", () => {
        const stats = fs.stat(config.downloadPath + "/cba6ed829709ed54b1079ae215a8658d", (err, stats) => {
          expect(err).to.be.null;
          expect(stats).to.not.be.null;
          expect(stats.isFile()).to.be.true;

          done();
        });
      });
    });

    it("should save financial server response to disk without RiseDisplayNetworkII.ini file", (done) => {
      let controller = new FinancialsController("https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175", null, logger);

      nock("https://contentfinancial2.appspot.com")
        .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
        .reply(200, "Financial data!");

      controller.getData();

      controller.on("saved", () => {
        const stats = fs.stat(config.downloadPath + "/cba6ed829709ed54b1079ae215a8658d", (err, stats) => {
          expect(err).to.be.null;
          expect(stats).to.not.be.null;
          expect(stats.isFile()).to.be.true;

          done();
        });
      });
    });

    it("should emit 'request-error' event if request responds with an error and there's no saved data", (done) => {
      financialsController.getData();

      financialsController.on("request-error", (err) => {
        expect(err).to.not.be.null;

        done();
      });
    });

    it("should not emit 'request-error' event if connection delay timeout under 2 minutes", (done) => {

      nock("https://contentfinancial2.appspot.com")
        .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
        .socketDelay(60000) // 1 min
        .reply(200, "Financial data!");

      financialsController.getData();

      financialsController.on("saved", () => {
        expect(true).to.be.true;

        done();
      });
    });

    it("should emit 'request-error' event if connection timeout surpasses 2 minutes and there's no saved data", (done) => {

      nock("https://contentfinancial2.appspot.com")
        .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
        .socketDelay(180000) // 3 mins
        .reply(200, "Financial data!");

      financialsController.getData();

      financialsController.on("request-error", (err) => {
        // checking just for ESOCKETTIMEDOUT because a ECONNRESET immediately follows it causing multiple done() calls
        if (err.code === "ESOCKETTIMEDOUT") {
          expect(err).to.not.be.null;

          done();
        }
      });
    });

    it("should not emit 'request-error' event if request responds with an error but saved data is available", (done) => {
      mock({
        [config.cachePath]: {
          "cba6ed829709ed54b1079ae215a8658d": "some content"
        }
      });

      financialsController.getData();

      financialsController.on("data", (data) => {
        expect(data).to.not.be.null;

        done();
      });
    });

  });

  describe("moveFileFromDownloadToCache", () => {

    afterEach(() => {
      mock.restore();
    });

    it("should move file to cache", () => {
      let content = "some content";

      // Mock file system and create file in the download directory.
      mock({
        [config.downloadPath]: {
          "cba6ed829709ed54b1079ae215a8658d": content
        },
        [config.cachePath]: {
        }
      });

      financialsController.moveFileFromDownloadToCache();

      fs.readFile(config.cachePath + "/cba6ed829709ed54b1079ae215a8658d", 'utf8', function(err, contents) {
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

      financialsController.moveFileFromDownloadToCache();

      financialsController.on("file-error", (err) => {
        expect(err).to.not.be.null;
      });
    });
  });

  describe("getSavedData", () => {

    afterEach(() => {
      mock.restore();
    });

    it("should retrieve saved response", (done) => {
      // Mock file system and create file in the download directory.
      mock({
        [config.cachePath]: {
          "cba6ed829709ed54b1079ae215a8658d": "some content"
        }
      });

      financialsController.getSavedData((err, data) => {
        expect(err).to.be.null;
        expect(data).to.not.be.null;

        done();
      });
    });

    it("should provide no saved response if no file exists", (done) => {
      // Mock file system and create file in the download directory.
      mock({
        [config.cachePath]: {}
      });

      financialsController.getSavedData((err, data) => {
        expect(err).to.be.undefined;
        expect(data).to.be.undefined;

        done();
      });
    });

  });

});