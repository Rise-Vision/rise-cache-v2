"use strict";

const fs = require("fs"),
  nock = require("nock"),
  mock = require("mock-fs"),
  sinon = require("sinon"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  error = require("../../app/middleware/error"),
  fileSystem = require("../../app/helpers/file-system"),
  Database = require("../../app/database"),
  expect = chai.expect,
  httpProxy = require("http-proxy");

chai.use(chaiHttp);

describe("/files endpoint", () => {
  let headers = {etag:"1a42b4479c62b39b93726d793a2295ca"};
  let headerDB = null;
  let server = null;
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

  before(() => {
    server = require("../../app/server")(config, logger);
    headerDB = new Database(config.headersDBPath);

    mock({
      [config.headersDBPath]: "",
      [config.downloadPath]: {},
      [config.cachePath]: {}
    });

    require("../../app/routes/file")(server.app, headerDB.db, riseDisplayNetworkII, config, logger);

    fileSystem.getAvailableSpace = function(logger, cb) {
      cb(availableSpace);
    };
  });

  beforeEach(() => {
    server.start();
    server.app.use(error.handleError);
  });

  afterEach(() => {
    server.stop();
  });

  after(() => {
    mock.restore();
    nock.cleanAll();
  });

  describe("download file", () => {

    beforeEach(() => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        [config.cachePath]: {},
        [config.headersDBPath]: "",
        "../data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    it("should return 202 with message while the file is downloading", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "../data/logo.png", headers);

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(res).to.have.status(202);
          expect(res.body).to.deep.equal({ status: 202, message: "File is downloading" });

          done();
        });
    });

    it("should return error if url parameter is missing", (done) => {
      chai.request("http://localhost:9494")
        .get("/files")
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.deep.equal({ status: 400, message: "Missing url parameter" });

          done();
        });
    });

    describe("File not found", () => {

      beforeEach(()=> {
        nock("http://example.com")
          .get("/logo.png")
          .reply(404);
      });

      it("should not save file if file server returns a 404", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
              expect(err).to.not.be.null;
              expect(err.errno).to.equal(34);
              expect(err.code).to.equal("ENOENT");
              expect(stats).to.be.undefined;

              done();
            });
          });
      });

      it("should return 534 when file is not found on the server", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(534);
            done();
          });
      });
    });

    describe("Not Reachable file server", () => {

      beforeEach(()=> {
        nock("http://example.com")
          .get("/logo.png")
          .replyWithError({"message": "something awful happened", "code": "AWFUL_ERROR"});
      });

      it("should not save file if file server can't be reached", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
              expect(err).to.not.be.null;
              expect(err.errno).to.equal(34);
              expect(err.code).to.equal("ENOENT");
              expect(stats).to.be.undefined;

              done();
            });
          });
      });

      it("should return a 504 status code if file server is not reachable", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(504);
            done();
          });
      });

    });

    describe("Invalid response from file server", () => {

      beforeEach(()=> {
        nock("http://example.com")
          .get("/logo.png")
          .reply(403);
      });

      it("should not save file if file server returns a status other than 200, 304, or 404", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
              expect(err).to.not.be.null;
              expect(err.errno).to.equal(34);
              expect(err.code).to.equal("ENOENT");
              expect(stats).to.be.undefined;

              done();
            });
          });
      });

      it("should return 502 when file server returns a status other than 200, 304, or 404", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(502);
            done();
          });
      });

    });

    describe("Insufficient disk space", () => {

      before(() => {
        availableSpace = 60000;
      });

      after(() => {
        availableSpace = 600000000;
      });

      it("should log info when there is insufficient disk space", (done) => {
        let spy = sinon.spy(logger, "info");

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(spy.calledWith("Insufficient disk space")).to.be.true;
            logger.info.restore();

            done();
          });
      });

      it("should return 507 when there is insufficient disk space", (done) => {
        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(507);
            expect(res.body).to.deep.equal({ status: 507, message: "Insufficient disk space" });

            done();
          });
      });

    });

  });

  describe("download file through a proxy", () => {
    let proxy;
    before(() => {
      proxy = httpProxy.createProxyServer({target:'http://example.com'}).listen(8080);
    });

    after(() => {
      proxy.close();
    });

    beforeEach(() => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        [config.cachePath]: {},
        [config.headersDBPath]: "",
        "../data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });

      riseDisplayNetworkII.get = function (property) {
        if (property == "activeproxy") {
          return "http://localhost:8080";
        }
      };
    });

    it("should return 202 with message while the file is downloading", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "../data/logo.png", headers);

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(res).to.have.status(202);
          expect(res.body).to.deep.equal({ status: 202, message: "File is downloading" });

          done();
        });
    });

    describe("File not found", () => {

      beforeEach(()=> {
        nock("http://example.com")
          .get("/logo.png")
          .reply(404);
      });

      it("should not save file if file server returns a 404", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
              expect(err).to.not.be.null;
              expect(err.errno).to.equal(34);
              expect(err.code).to.equal("ENOENT");
              expect(stats).to.be.undefined;

              done();
            });
          });
      });

      it("should return 534 when file is not found on the server through proxy", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(534);
            done();
          });
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

      it("should not save file if proxy server can't be reached", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
              expect(err).to.not.be.null;
              expect(err.errno).to.equal(34);
              expect(err.code).to.equal("ENOENT");
              expect(stats).to.be.undefined;

              done();
            });
          });
      });

      it("should return a 504 status code if proxy server is not reachable", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(504);
            done();
          });
      });
    });

    describe("Invalid response from proxy server", () => {

      beforeEach(()=> {
        nock("http://example.com")
          .get("/logo.png")
          .reply(403);
      });

      it("should not save file if proxy server returns a status other than 200, 304, or 404", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
              expect(err).to.not.be.null;
              expect(err.errno).to.equal(34);
              expect(err.code).to.equal("ENOENT");
              expect(stats).to.be.undefined;

              done();
            });
          });
      });

      it("should return 502 when proxy server returns a status other than 200, 304, or 404", (done) => {

        chai.request("http://localhost:9494")
          .get("/files")
          .query({ url: "http://example.com/logo.png" })
          .end((err, res) => {
            expect(res.statusCode).to.equal(502);
            done();
          });
      });

    });

  });

  describe("downloading, not cached", () => {

    it("should return 202 with message if the file is already being downloaded", (done) => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {
          "cdf42c077fe6037681ae3c003550c2c5": "some content"
        },
        [config.cachePath]: {},
        [config.headersDBPath]: "",
        "../data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });

      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "../data/logo.png", headers);

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(res).to.have.status(202);
          expect(res.body).to.deep.equal({ status: 202, message: "File is downloading" });

          done();
        });
    });

  });

  describe("existing file", () => {

    it("should fetch file from disk if it already exists", (done) => {
      // Create file on mock file system.
      mock({
        [config.cachePath]: {
          "cdf42c077fe6037681ae3c003550c2c5": "some content"
        }
      });

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);

          done();
        });
    });

    it("should return headers saved on DB", (done) => {

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.headers.etag).to.deep.equal(headers.etag);
          done();
        });
    });

    it("should not return headers if it is not available", (done) => {

      mock({
        [config.cachePath]: {
          "cdf42c077fe6037681ae3c003550c2c5": "some content"
        },
        [config.headersDBPath]: ""
      });

      headerDB.db.loadDatabase();

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.headers.etag).to.be.undefined;
          done();
        });
    });

    it("should log an error when headers are not available", (done) => {
      let spy = sinon.spy(logger, "error");

      mock({
        [config.cachePath]: {
          "cdf42c077fe6037681ae3c003550c2c5": "some content"
        },
        [config.headersDBPath]: ""
      });

      headerDB.db.loadDatabase();

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end(() => {
          expect(spy.calledWith("No headers available", "http://example.com/logo.png"));
          logger.error.restore();
          done();
        });
    });

    it("should return an error if file exists but could not be read", (done) => {
      // Create file with no read permissions.
      mock({
        [config.cachePath]: {
          "cdf42c077fe6037681ae3c003550c2c5": mock.file({
            content: "some content",
            mode: "0000"
          })
        }
      });

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(res).to.have.status(500);
          expect(res.body).to.deep.equal({
            status: 500,
            message: "EACCES, permission denied '" + config.cachePath + "/cdf42c077fe6037681ae3c003550c2c5'"
          });

          done();
        });
    });

    it("should log an error on request-error", (done) => {
      let spy = sinon.spy(logger, "error");

      nock("http://example.com")
        .get("/logo.png")
        .replyWithError({ "message": "something awful happened", "code": "AWFUL_ERROR" });

      mock({
        [config.headersDBPath]: "",
        [config.downloadPath]: {},
        [config.cachePath]: {}
      });

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(spy.callCount).to.equal(1);

          logger.error.restore();
          done();
        });
    });

  });

});