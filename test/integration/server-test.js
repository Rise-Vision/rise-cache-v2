"use strict";

var fs = require("fs"),
  mock = require("mock-fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  expect = chai.expect;

var config = require("../../config/config");
var server = require("../../app/server")(config);

chai.use(chaiHttp);

describe("Loading", function () {

  beforeEach(function () {
    server.start();
  });

  it("should listen on localhost:9494", function (done) {
    chai.request('http://localhost:9494')
    .get('/')
    .end(function(err, res) {
      expect(res).to.have.status(404);
      done();
    });
  });

  afterEach(function () {
    server.stop();
  });
});

describe("Delete unused files", () => {

  beforeEach(function () {
    let now = new Date();

    now.setDate(now.getDate() - 7);

    mock({
      [config.cachePath]: {
        "cdf42c077fe6037681ae3c003550c2c5": mock.file({
          content: "some content",
          atime: now
        }),
        "708ade626663c84bebe7580762befe99": mock.file({
          content: "some content",
          atime: new Date()
        })
      }
    });

    server.start();
    server.init();
  });

  afterEach(function () {
    mock.restore();
    server.stop();
  });

  it("should delete file that has not been accessed within the last 7 days", (done) => {
    // Wait for file to be deleted before running test.
    setTimeout(function() {
      fs.stat(config.cachePath + "/" + "cdf42c077fe6037681ae3c003550c2c5", (err, stats) => {
        expect(stats).to.be.undefined;
        expect(err).to.not.be.null;
        expect(err.code).to.equal("ENOENT");  // No such file or directory.

        done();
      });
    }, 0);
  });

  it("should not delete file that has been accessed within the last 7 days", (done) => {
    setTimeout(function() {
      fs.stat(config.cachePath + "/" + "708ade626663c84bebe7580762befe99", (err, stats) => {
        expect(err).to.be.null;
        expect(stats).to.not.be.undefined;

        done();
      });
    }, 0);
  });

});