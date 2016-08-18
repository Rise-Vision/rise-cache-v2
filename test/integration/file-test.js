"use strict";

const nock = require("nock"),
  mock = require("mock-fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  server = require("../../app/server")(config),
  error = require("../../app/middleware/error"),
  file = require("../../app/routes/file")(server.app),
  expect = chai.expect;

chai.use(chaiHttp);

describe("files endpoint", () => {

  beforeEach(() => {
    server.start();
    server.app.use(error.handleError);

    // Mock the file system.
    mock({
      [config.downloadPath]: {},
      "/data/logo.png": new Buffer([8, 6, 7, 5, 3, 0, 9])
    });
  });

  afterEach(() => {
    server.stop();
    mock.restore();
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