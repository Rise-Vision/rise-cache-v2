"use strict";

const chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  expect = chai.expect;

chai.use(chaiHttp);

describe("/displays endpoint", () => {
  let logger = {
    info: function (x){},
    error:function (x){},
    warn: function (x){}
  };
  let server = require("../../app/server")(config, logger);
  let error = require("../../app/middleware/error")(logger);


  let riseDisplayNetworkII = {
    get: function (property) {
      if (property == "activeproxy") {
        return "";
      }

      if (property == "displayid") {
        return "abc123";
      }
    }
  };

  before(() => {
    require("../../app/routes/display")(server.app, riseDisplayNetworkII.get("displayid"));
  });

  beforeEach(() => {
    server.start();
    server.app.use(error.handleError);
  });

  afterEach((done) => {
    server.stop(() => {
      done();
    });
  });

  it("should return displayId", function (done) {
    chai.request('http://localhost:9494')
      .get('/displays')
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('object');
        expect(res.body.displayId).to.be.equal("abc123");
        done();
      });
  });
});
