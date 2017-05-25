"use strict";

const mock = require("mock-fs"),
  expect = require('chai').expect,
  config = require("../../config/config"),
  database = require("../../app/database"),
  spreadsheetData = require("../data/spreadsheets.json"),
  cert = config.httpsOptions.cert;

let request = require("superagent");
request = request.agent({ca: cert});

describe("/spreadsheets endpoint", () => {
  let logger = {
    info: function (x){},
    error: function (x){},
    warn: function (x){}
  };
  let spreadsheetDB = null;
  let server = require("../../app/server")(config, logger);
  let error = require("../../app/middleware/error")(logger);

  before(() => {
    mock({
      [config.spreadsheetsDBPath]: ""
    });

    spreadsheetDB = new database(config.spreadsheetsDBPath);
    require("../../app/routes/spreadsheets")(server.app, spreadsheetDB.db);
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
    request.post("https://localhost:9494/spreadsheets")
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
    request.post("https://localhost:9494/spreadsheets")
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
    request.post("https://localhost:9494/spreadsheets")
      .send(spreadsheetData)
      .end((err, res) => {
        expect(res.status).to.equal(201);
        expect(res.body).to.deep.equal(spreadsheetData);

        done();
      });
  });

  it("should get data", function (done) {

    request.get("https://localhost:9494/spreadsheets/" + spreadsheetData.key)
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body.key).to.deep.equal(spreadsheetData.key);
        expect(res.body.value).to.deep.equal(spreadsheetData.value);

        done();
      });
  });

  it("should return 404 if data is not found", function (done) {

    request.get("https://localhost:9494/spreadsheets/1")
      .end((err, res) => {
        expect(res.status).to.equal(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  it("should delete data", function (done) {

    request.delete("https://localhost:9494/spreadsheets/" + spreadsheetData.key)
      .end((err, res) => {
        expect(res.status).to.equal(204);

        done();
      });
  });

  it("should return 404 if data to delete was not found", function (done) {

    request.get("https://localhost:9494/spreadsheets/" + spreadsheetData.key)
      .end((err, res) => {
        expect(res.status).to.equal(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  it("should return an error if 'key' is not PUTed", function (done) {
    request.put("https://localhost:9494/spreadsheets/"+spreadsheetData.key)
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
    request.put("https://localhost:9494/spreadsheets/"+spreadsheetData.key)
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
    request.put("https://localhost:9494/spreadsheets/"+spreadsheetData.key)
      .send(spreadsheetData)
      .end((err, res) => {
        expect(res.status).to.equal(201);
        expect(res.body).to.deep.equal(spreadsheetData);

        done();
      });
  });
});
