"use strict";

const mock = require("mock-fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  database = require("../../app/database"),
  rssData = require("../data/rss.json"),
  expect = chai.expect;

chai.use(chaiHttp);

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
    mock({
      [config.rssDBPath]: ""
    });

    rssDB = new database(config.rssDBPath);
    require("../../app/routes/rss")(server.app, rssDB.db);
  });

  after(() => {
    mock.restore();
  });

  beforeEach(() => {
    server.start();
    server.app.use(error.handleError);
  });

  afterEach(() => {
    server.stop();
  });

  it("should return an error if 'key' is not POSTed", function (done) {
    chai.request("http://localhost:9494")
      .post("/rss")
      .send({
        "value": ""
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should return an error if 'value' is not POSTed", function (done) {
    chai.request("http://localhost:9494")
      .post("/rss")
      .send({
        "key": ""
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should save data and return saved entity", function (done) {
    chai.request("http://localhost:9494")
      .post("/rss")
      .send(rssData)
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.deep.equal(rssData);

        done();
      });
  });

  it("should get data", function (done) {

    chai.request("http://localhost:9494")
      .get("/rss/" + rssData.key)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.key).to.deep.equal(rssData.key);
        expect(res.body.value).to.deep.equal(rssData.value);

        done();
      });
  });

  it("should return 404 if data is not found", function (done) {

    chai.request("http://localhost:9494")
      .get("/rss/1")
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  it("should delete data", function (done) {

    chai.request("http://localhost:9494")
      .delete("/rss/" + rssData.key)
      .end((err, res) => {
        expect(res).to.have.status(204);

        done();
      });
  });

  it("should return 404 if data to delete was not found", function (done) {

    chai.request("http://localhost:9494")
      .get("/rss/" + rssData.key)
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  it("should return an error if 'key' is not PUTed", function (done) {
    chai.request("http://localhost:9494")
      .put("/rss/"+rssData.key)
      .send({
        "value": ""
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should return an error if 'value' is not PUTed", function (done) {
    chai.request("http://localhost:9494")
      .put("/rss/"+rssData.key)
      .send({
        "key": ""
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.deep.equal({ status: 400, message: "Missing POST data" });

        done();
      });
  });

  it("should update data and return saved entity", function (done) {
    chai.request("http://localhost:9494")
      .put("/rss/"+rssData.key)
      .send(rssData)
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.deep.equal(rssData);

        done();
      });
  });
});
