"use strict";

const fs = require("fs"),
  nock = require("nock"),
  mock = require("mock-fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  server = require("../../app/server")(config),
  error = require("../../app/middleware/error"),
  Database = require("../../app/database"),
  expect = chai.expect;

chai.use(chaiHttp);

describe("/files endpoint", () => {

  before(() => {
    let headerDB = new Database(config.headersDBPath);
    require("../../app/routes/file")(server.app, server.proxy, headerDB.db);

    server.init();
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
  });

  describe("download file", () => {

    beforeEach(() => {
      // Mock the file system.
      mock({
        [config.downloadPath]: {},
        [config.headersDBPath]: "",
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    it("should return 200 status code if the file was successfully downloaded", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      chai.request("http://localhost:9494")
        .get("/files?url=http://example.com/logo.png")
        .end((err, res) => {
          expect(res).to.have.status(200);

          done();
        });
    });

    it("should save downloaded file to disk with encrypted file name", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png");

      chai.request("http://localhost:9494")
        .get("/files?url=http://example.com/logo.png")
        .end((err, res) => {
          const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
            expect(err).to.be.null;
            expect(stats).to.not.be.null;
            expect(stats.isFile()).to.be.true;

            done();
          });
        });
    });

    it("should not save file if there's an error", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .reply(404);

      chai.request("http://localhost:9494")
        .get("/files?url=http://example.com/logo.png")
        .end((err, res) => {
          const stats = fs.stat(config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
            expect(err).to.not.be.null;
            expect(stats).to.be.undefined;

            done();
          });
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

    it("should return error if file server responds with an error", (done) => {
      nock("http://example.com")
        .get("/error.png")
        .replyWithError("Something bad happened");

      chai.request("http://localhost:9494")
        .get("/files?url=http://example.com/error.png")
        .end((err, res) => {
          expect(res).to.have.status(500);
          expect(res.body).to.deep.equal({ status: 500, message: "Something bad happened" });

          done();
        });
    });

  });

  describe("existing file", () => {

    it("should fetch file from disk if it already exists", (done) => {
      // Create file on mock file system.
      mock({
        [config.downloadPath]: {
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

    it("should return an error if file exists but could not be read", (done) => {
      // Create file with no read permissions.
      mock({
        [config.downloadPath]: {
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
            message: "EACCES, permission denied '" + config.downloadPath + "/cdf42c077fe6037681ae3c003550c2c5'"
          });

          done();
        });
    });

  });

});