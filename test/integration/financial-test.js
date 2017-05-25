"use strict";

const mock = require("mock-fs"),
  expect = require('chai').expect,
  config = require("../../config/config"),
  database = require("../../app/database"),
  financialData = require("../data/financial.json"),
  cert = config.httpsOptions.cert;

let request = require("superagent");
request = request.agent({ca: cert});

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
    request.post("https://localhost:9494/financial")
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
    request.post("https://localhost:9494/financial")
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
    request.post("https://localhost:9494/financial")
      .send(financialData)
      .end((err, res) => {
        expect(res.status).to.equal(201);
        expect(res.body).to.deep.equal(financialData);

        done();
      });
  });

  it("should get data", function (done) {

    request.get("https://localhost:9494/financial/" + financialData.key)
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body.key).to.deep.equal(financialData.key);
        expect(res.body.value).to.deep.equal(financialData.value);

        done();
      });
  });

  it("should return 404 if data is not found", function (done) {

    request.get("https://localhost:9494/financial/1")
      .end((err, res) => {
        expect(res.status).to.equal(404);
        expect(res.body).to.deep.equal({ status: 404, message: "Not found" });

        done();
      });
  });

  describe( "DELETE", () => {

    it( "should delete data", ( done ) => {
      request.delete( "https://localhost:9494/financial/" + financialData.key )
        .end( ( err, res ) => {
          expect( res.status ).to.equal( 204 );

          done();
        } );
    } );

    it( "should return 404 if data to delete was not found", ( done ) => {
      request.delete( "https://localhost:9494/financial/" + financialData.key )
        .end( ( err, res ) => {
          expect( res.status ).to.equal( 404 );
          expect( res.body ).to.deep.equal( { status: 404, message: "Not found" } );

          done();
        } );
    } );

  } );

  describe( "PUT", () => {

    it( "should return 400 if data was not sent", ( done ) => {
      request.put( "https://localhost:9494/financial/" + financialData.key )
        .end( ( err, res ) => {
          expect( res.status ).to.equal( 400 );
          expect( res.body ).to.deep.equal( {
            status: 400,
            message: "Missing PUT data"
          } );

          done();
        } );
    } );

    it( "should update data and return saved entity", ( done ) => {
      request.put( "https://localhost:9494/financial/" + financialData.key )
        .send( financialData )
        .end( ( err, res ) => {
          expect( res.status ).to.equal( 201 );
          expect( res.body ).to.deep.equal( financialData );

          done();
        } );
    } );

  } );

});