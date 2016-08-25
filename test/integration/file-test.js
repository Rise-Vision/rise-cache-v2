"use strict";

const nock = require("nock"),
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
  let headers = {etag:"1a42b4479c62b39b93726d793a2295ca"};
  let headerDB = null;

  before(() => {
    mock({
      [config.headersDBPath]: "",
      [config.downloadPath]: {},
      [config.cachePath]: {}
    });
    headerDB = new Database(config.headersDBPath);
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
        [config.cachePath]: {},
        [config.headersDBPath]: "",
        "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
      });
    });

    it("should return 200 status code if the file was successfully downloaded", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png", headers);

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res).to.not.be.null;

          done();
        });
    });

    it("should return headers if the file was successfully downloaded", (done) => {
      nock("http://example.com")
        .get("/logo.png")
        .replyWithFile(200, "/data/logo.png", headers);

      chai.request("http://localhost:9494")
        .get("/files")
        .query({ url: "http://example.com/logo.png" })
        .end((err, res) => {
          expect(res.headers.etag).to.deep.equal(headers.etag);

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

    it("should return error if url parameter is missing", (done) => {
      chai.request("http://localhost:9494")
        .get("/files")
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.deep.equal({ status: 400, message: "Missing url parameter" });

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

  });

});