"use strict";

const fs = require('fs'),
  expect = require('chai').expect,
  nock = require("nock"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  config = require("../../config/config"),
  fileSystem = require("../../app/helpers/file-system"),
  httpProxy = require("http-proxy"),
  hashFiles = require('hash-files'),
  cert = config.httpsOptions.cert;

global.DOWNLOAD_TOTAL_SIZE = 0;
global.PROCESSING_LIST = new Set();

let request = require("superagent");
request = request.agent({ca: cert});

describe("/financials endpoint", () => {
  let now = new Date();
  let server = null;
  let error = null;
  let logger = {
    info: function (x){},
    error: function (x){},
    warn: function (x){}
  };
  let availableSpace = 600000000;

  let riseDisplayNetworkII = {
    get: function (property) {
      if (property == "activeproxy") {
        return "";
      }
    }
  };

  let fileHash = "";

  before(() => {
    server = require("../../app/server")(config, logger);
    error = require("../../app/middleware/error")(logger);

    require("../../app/routes/financials")(server.app, riseDisplayNetworkII, logger);

    mock({
      [config.downloadPath]: {},
      [config.cachePath]: {}
    });

    fileSystem.getAvailableSpace = function(logger, cb) {
      cb(availableSpace);
    };
    server.start();
    server.app.use(error.handleError);
  });

  after((done) => {
    mock.restore();
    nock.cleanAll();
    server.stop(() => {
      done();
    });
  });

  afterEach(() => {
    mock.restore();
    nock.cleanAll();
  });

  describe("Request data from financial server", () => {

    beforeEach((done) => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        [config.cachePath]: {},
        "../data/financials": "Financial data!"
      });

      hashFiles({files:["../data/financials"]},function(error, hash) {
        fileHash = hash;
        done();
      });

    });

    it("should return 200 and save to file", (done) => {
      nock("https://contentfinancial2.appspot.com")
        .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
        .reply(200, "Financial data!");

      request.get("http://localhost:9494/financials")
        .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.not.be.null;
          expect(res.text).to.equal("Financial data!");

          hashFiles({files:[config.cachePath + "/cba6ed829709ed54b1079ae215a8658d"]},function(error, hash) {
            expect(hash).to.equal(fileHash);
            done();
          });
        });
    });

    it("should return error if url parameter is missing", (done) => {
      request.get("http://localhost:9494/financials")
        .end((err, res) => {
          expect(err.status).to.equal(400);
          expect(res.body).to.deep.equal({ status: 400, message: "Missing url parameter" });

          done();
        });
    });

    describe("Invalid response from financial server", () => {

      beforeEach(()=> {
        nock("https://contentfinancial2.appspot.com")
          .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
          .reply(403);
      });

      it("should log an error if file server returns a status other than 200", (done) => {
        let spy = sinon.spy(logger, "error");

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(spy.calledWith("Invalid response with status code 403", null, "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")).to.be.true;
            logger.error.restore();

            done();
          });
      });

      it("should return 502 when file server returns a status other than 200", (done) => {

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(502);
            done();
          });
      });

      it("should return 200 with data on bad status when saved data exists", (done) => {
        // Create file on mock file system.
        mock({
          [config.cachePath]: {
            "cba6ed829709ed54b1079ae215a8658d": mock.file({
              content: "Financial data!"
            })
          }
        });

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);

            done();
          });
      });

      it("should return 502 and log file error if saved data exists but could not be read", (done) => {
        let spy = sinon.spy(logger, "error");

        // Create file with no read permissions.
        mock({
          [config.cachePath]: {
            "cba6ed829709ed54b1079ae215a8658d": mock.file({
              content: "Financial data!",
              mode: "0000"
            })
          }
        });

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(res.status).to.equal(502);
            expect(res.body).to.deep.equal({
              status: 502,
              message: "File's host server returned an invalid response with status code: 403"
            });

            expect(spy.args[0][0].message).to.be.equal("EACCES, permission denied '" + config.cachePath + "/cba6ed829709ed54b1079ae215a8658d'");
            expect(spy.args[0][1]).to.be.null;
            expect(spy.args[0][2]).to.be.equal("https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175");
            logger.error.restore();

            done();
          });
      });

    });

    describe("Request error from financial server", () => {

      it("should log an error on request-error", (done) => {
        let spy = sinon.spy(logger, "error");

        nock("https://contentfinancial2.appspot.com")
          .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
          .replyWithError({ "message": "something awful happened", "code": "AWFUL_ERROR" });

        mock({
          [config.downloadPath]: {},
          [config.cachePath]: {}
        });

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(spy.callCount).to.equal(1);

            logger.error.restore();
            done();
          });
      });

      it("should return 504 on request error", (done) => {
        nock("https://contentfinancial2.appspot.com")
          .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
          .replyWithError({ "message": "something awful happened", "code": "AWFUL_ERROR" });

        mock({
          [config.downloadPath]: {},
          [config.cachePath]: {}
        });

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(res.status).to.equal(504);
            done();
          });
      });

      it("should return 200 with data on request-error when saved data exists", (done) => {
        let spy = sinon.spy(logger, "error");

        nock("https://contentfinancial2.appspot.com")
          .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
          .replyWithError({ "message": "something awful happened", "code": "AWFUL_ERROR" });

        // Create file on mock file system.
        mock({
          [config.cachePath]: {
            "cba6ed829709ed54b1079ae215a8658d": mock.file({
              content: "Financial data!"
            })
          }
        });

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(spy.callCount).to.equal(0);
            expect(err).to.be.null;
            expect(res.status).to.equal(200);

            logger.error.restore();
            done();
          });
      });

      it("should return an error if saved data exists but could not be read", (done) => {
        let spy = sinon.spy(logger, "error");

        // Create file with no read permissions.
        mock({
          [config.cachePath]: {
            "cba6ed829709ed54b1079ae215a8658d": mock.file({
              content: "Financial data!",
              mode: "0000"
            })
          }
        });

        nock("https://contentfinancial2.appspot.com")
          .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
          .replyWithError({ "message": "something awful happened", "code": "AWFUL_ERROR" });

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(res.status).to.equal(504);
            expect(res.body).to.deep.equal({
              status: 504,
              message: "Financial server could not be reached"
            });

            expect(spy.args[0][0].message).to.be.equal("EACCES, permission denied '" + config.cachePath + "/cba6ed829709ed54b1079ae215a8658d'");
            expect(spy.args[0][1]).to.be.null;
            expect(spy.args[0][2]).to.be.equal("https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175");
            logger.error.restore();

            done();
          });
      });

    });

    describe("Insufficient disk space to save data", () => {

      before(() => {
        availableSpace = 60000;
      });

      after(() => {
        availableSpace = 600000000;
      });

      it("should log error when there is insufficient disk space to save response to file", (done) => {
        let spy = sinon.spy(logger, "error");

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(spy.calledWith("Insufficient disk space")).to.be.true;
            logger.error.restore();

            done();
          });
      });

    });

  });

  describe("Request data from financial server through a proxy", () => {
    let proxy;
    before(() => {
      proxy = httpProxy.createProxyServer({target:'https://contentfinancial2.appspot.com'}).listen(8080);
    });

    after(() => {
      proxy.close();

      riseDisplayNetworkII.get = function (property) {
        if (property == "activeproxy") {
          return "";
        }
      };
    });

    beforeEach(() => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        [config.cachePath]: {},
        "../data/financials": "Financial data!"
      });

      riseDisplayNetworkII.get = function (property) {
        if (property == "activeproxy") {
          return "http://localhost:8080";
        }
      };
    });

    it("should return 200 and save to file", (done) => {
      nock("https://contentfinancial2.appspot.com")
        .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
        .reply(200, "Financial data!");

      request.get("http://localhost:9494/financials")
        .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.not.be.null;
          expect(res.text).to.equal("Financial data!");

          done();
        });
    });

    describe("Not Reachable proxy server", () => {

      beforeEach(()=> {
        riseDisplayNetworkII.get = function (property) {
          if (property == "activeproxy") {
            return "http://localhost:8081";
          }
        };
      });

      it("should return a 504 status code if proxy server is not reachable", (done) => {

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(504);
            done();
          });
      });
    });

    describe("Invalid response from proxy server", () => {

      beforeEach(()=> {
        nock("https://contentfinancial2.appspot.com")
          .get("/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175")
          .reply(403);
      });

      it("should return 502 when proxy server returns a status other than 200, 304, or 404", (done) => {

        request.get("http://localhost:9494/financials")
          .query({ url: "https://contentfinancial2.appspot.com/data?id=preview&code=.AV.O&tqx=out%3Ajson%3BresponseHandler%3AcmlzZWZpbm&tq=select%20instrument%2Cname%2ClastPrice%2CnetChange&callback=cmlzZWZpbm&_=0fafc8432f9f4e919a1aaa9e47785175" })
          .end((err, res) => {
            expect(res.status).to.equal(502);
            done();
          });
      });

    });

  });
});