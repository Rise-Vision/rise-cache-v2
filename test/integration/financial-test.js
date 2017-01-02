"use strict";

const mock = require("mock-fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  database = require("../../app/database"),
  financialData = require("../data/financial.json"),
  expect = chai.expect;

chai.use(chaiHttp);

describe("/financial endpoint", () => {
  let logger = {
    info: function (x){},
    error: function (x){},
    warn: function (x){}
  };
  let financialDB = null;
  let server = require("../../app/server")(config, logger);
  let error = require("../../app/middleware/error")(logger);

  before(() => {
    mock({
      [config.financialDBPath]: ""
    });

    financialDB = new database(config.financialDBPath);
    require("../../app/routes/financial")(server.app, financialDB.db);
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
      .post("/financial")
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
      .post("/financial")
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
      .post("/financial")
      .send(financialData)
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.deep.equal(financialData);

        done();
      });
  });

  it("should get data", function (done) {

    chai.request("http://localhost:9494")
      .get("/financial/" + financialData.key)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.key).to.deep.equal(financialData.key);
        expect(res.body.value).to.deep.equal(financialData.value);

        done();
      });
  });

  it("should return 404 if data is not found", function (done) {

    chai.request("http://localhost:9494")
      .get("/financial/1")
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  describe( "DELETE", () => {
    it( "should delete data", ( done ) => {
      chai.request( "http://localhost:9494" )
        .delete( "/financial/" + financialData.key )
        .end( ( err, res ) => {
          expect( res ).to.have.status( 204 );

          done();
        } );
    } );

    it( "should return 404 if data to delete was not found", ( done ) => {
      chai.request( "http://localhost:9494" )
        .get( "/financial/" + financialData.key )
        .end( ( err, res ) => {
          expect( res ).to.have.status( 404 );
          expect( res.body ).to.deep.equal( { status: 404, message: "Not found" } );

          done();
        } );
    } );
  } );

});