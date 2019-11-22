"use strict";

const fs = require("fs-extra"),
  expect = require('chai').expect,
  mock = require("mock-fs"),
  sinon = require("sinon"),
  config = require("../../config/config"),
  cert = config.httpsOptions.cert;


let request = require("superagent");
request = request.agent({ca: cert});

const app = require("../../app/app")();
const pkg = require("../../package.json");

describe("Ping", function () {
  let spy;

  before(function () {
    spy = sinon.spy(console, "warn");
    app.start();
  });

  after((done) => {
    app.stop(() => {
    }, () => {
      done();
    });

    mock.restore();
    spy.restore();
  });

  it("should return Access Control entries on the headers for all origin", (done) => {
    request.get('http://localhost:9494/')
      .end(function(err, res) {
        expect(res.status).to.equal(200);
        expect(res.headers["access-control-allow-origin"]).to.be.equal("*");
        expect(res.headers["access-control-allow-credentials"]).to.be.equal("true");
        expect(res.headers["cache-control"]).to.be.equal("no-cache");
        done();
      });
  });

  it("should return Access Control entries on the headers for request origin", (done) => {
    request.get('http://localhost:9494/')
      .set('origin', 'http://localhost:8080')
      .end(function(err, res) {
        expect(res.status).to.equal(200);
        expect(res.headers["access-control-allow-origin"]).to.be.equal("http://localhost:8080");
        expect(res.headers["access-control-allow-credentials"]).to.be.equal("true");
        expect(res.headers["cache-control"]).to.be.equal("no-cache");
        done();
      });
  });

  it("should return name and version without RiseDisplayNetworkII.ini file", (done) => {
    request.get('http://localhost:9494/')
    .end(function(err, res) {
      expect(res.status).to.equal(200);
      expect(res).to.be.json;
      expect(res.body).to.be.a('object');
      expect(res.body.name).to.be.equal(pkg.name);
      expect(res.body.version).to.be.equal(pkg.version);

      done();
    });
  });

  it("should return name and version with RiseDisplayNetworkII.ini file for HTTP", function (done) {

    request.get('http://localhost:9494/')
      .end(function(err, res) {
        expect(res.status).to.equal(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('object');
        expect(res.body.name).to.be.equal(pkg.name);
        expect(res.body.version).to.be.equal(pkg.version);
        expect(spy.calledTwice).to.be.false;
        done();
      });
  });

  it("should return name and version with RiseDisplayNetworkII.ini file for HTTPS", function (done) {

    request.get('https://localhost:9495/')
      .end(function(err, res) {
        expect(res.status).to.equal(200);
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

  it("should cleanup download folder on app start up", function (done) {

    fs.readdir(config.downloadPath, function (err, items) {
      expect(items.length).to.equal(0);
      done();
    });
  });

});