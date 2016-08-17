"use strict";

const nock = require("nock"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  server = require("../../app/server")(config),
  error = require("../../app/middleware/error"),
  file = require("../../app/routes/file")(server.app),
  expect = chai.expect;

chai.use(chaiHttp);

describe("files endpoint", function () {

  beforeEach(function () {
    server.start();
    server.app.use(error.handleError);

    nock("http://example.com")
      .get("/logo.png")
      .replyWithFile(200, __dirname + "/data/logo.png");
  });

  afterEach(function () {
    server.stop();
  });

  it("should return 200 status code if the file was successfully downloaded", function (done) {
    chai.request("http://localhost:9494")
      .get("/files?url=http://example.com/logo.png")
      .end(function(err, res) {
        expect(res).to.have.status(200);

        done();
      });
  });

  it("should return error if url parameter is missing", function (done) {
    chai.request("http://localhost:9494")
      .get("/files")
      .end(function(err, res) {
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
      .end(function(err, res) {
        expect(res).to.have.status(500);
        expect(res.body).to.deep.equal({ status: 500, message: "Something bad happened" });

        done();
      });
  });

});