"use strict";

const fs = require("fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  expect = chai.expect,
  mock = require("mock-fs"),
  sinon = require("sinon");


const app = require("../../app/app")();
const config = require("../../config/config");
const pkg = require("../../package.json");

chai.use(chaiHttp);

describe("Ping", function () {
  let spy;

  before(function () {
    spy = sinon.spy(console, "warn");

    mock({
      [config.headersDBPath]: "",
      [config.metadataDBPath]: "",
      [config.downloadPath]: {},
      [config.cachePath]: {},
      [config.logFilePath]: "Some Content"
    });
    app.start();
  });

  after(() => {
    app.stop();
    mock.restore();
    spy.restore();
  });

  it("should return name and version without RiseDisplayNetworkII.ini file", (done) => {
    chai.request('http://localhost:9494')
    .get('/')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.a('object');
      expect(res.body.name).to.be.equal(pkg.name);
      expect(res.body.version).to.be.equal(pkg.version);
      expect(spy.calledWith("RiseDisplayNetworkIIPath.ini file not found.")).to.be.true;

      done();
    });
  });

  it("should return name and version with RiseDisplayNetworkII.ini file", function (done) {
    mock({
      [config.headersDBPath]: "",
      [config.metadataDBPath]: "",
      [config.downloadPath]: {},
      [config.cachePath]: {},
      [config.riseDisplayNetworkIIPath]: ""
    });

    chai.request('http://localhost:9494')
      .get('/')
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('object');
        expect(res.body.name).to.be.equal(pkg.name);
        expect(res.body.version).to.be.equal(pkg.version);
        expect(spy.calledTwice).to.be.false;
        done();
      });
  });

  it("should cleanup log file on app start up", function (done) {
    fs.readFile(config.logFilePath, 'utf8', function(err, contents) {
      expect(contents).to.not.equal("Some Content");
      done();
    });
  });

});