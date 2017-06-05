"use strict";

const mock = require("mock-fs"),
  expect = require('chai').expect,
  config = require("../../config/config"),
  database = require("../../app/database"),
  rssData = require("../data/rss.json"),
  cert = config.httpsOptions.cert;

let request = require("superagent");
request = request.agent({ca: cert});

describe("/rss endpoint", () => {
  let logger = {
    info: function (x){},
    error: function (x){},
    warn: function (x){}
  };
  let rssDB = null;
  let server = require("../../app/server")(config, logger);
  let error = require("../../app/middleware/error")(logger);

  before(() => {

    rssDB = new database(config.rssDBPath);
    require("../../app/routes/rss")(server.app, rssDB.db);
    server.start();
    server.app.use(error.handleError);

  });

  after((done) => {
    mock.restore();
    server.stop(() => {
      done();
    });
  });

  it("should return an error if 'key' is not POSTed", function (done) {
    request.post("http://localhost:9494/rss")
      .send({
        "value": ""
      })
      .end((err, res) => {
        expect(res.status).to.equal(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should return an error if 'value' is not POSTed", function (done) {
    request.post("http://localhost:9494/rss")
      .send({
        "key": ""
      })
      .end((err, res) => {
        expect(res.status).to.equal(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should save data and return saved entity", function (done) {
    request.post("http://localhost:9494/rss")
      .send(rssData)
      .end((err, res) => {
        expect(res.status).to.equal(201);
        expect(res.body).to.deep.equal(rssData);

        done();
      });
  });

  it("should get data", function (done) {

    request.get("http://localhost:9494/rss/" + rssData.key)
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body.key).to.deep.equal(rssData.key);
        expect(res.body.value).to.deep.equal(rssData.value);

        done();
      });
  });

  it("should return 404 if data is not found", function (done) {

    request.get("http://localhost:9494/rss/1")
      .end((err, res) => {
        expect(res.status).to.equal(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  it("should delete data", function (done) {

    request.delete("http://localhost:9494/rss/" + rssData.key)
      .end((err, res) => {
        expect(res.status).to.equal(204);

        done();
      });
  });

  it("should return 404 if data to delete was not found", function (done) {

    request.get("http://localhost:9494/rss/" + rssData.key)
      .end((err, res) => {
        expect(res.status).to.equal(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  it("should return an error if 'key' is not PUTed", function (done) {
    request.put("http://localhost:9494/rss/" + rssData.key)
      .send({
        "value": ""
      })
      .end((err, res) => {
        expect(res.status).to.equal(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should return an error if 'value' is not PUTed", function (done) {
    request.put("http://localhost:9494/rss/" + rssData.key)
      .send({
        "key": ""
      })
      .end((err, res) => {
        expect(res.status).to.equal(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should update data and return saved entity", function (done) {
    request.put("http://localhost:9494/rss/" + rssData.key)
      .send(rssData)
      .end((err, res) => {
        expect(res.status).to.equal(201);
        expect(res.body).to.deep.equal(rssData);

        done();
      });
  });
});
