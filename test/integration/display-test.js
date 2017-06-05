"use strict";

const fs = require('fs'),
  expect = require('chai').expect,
  request = require("superagent"),
  config = require("../../config/config"),
  cert = config.httpsOptions.cert;


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
    server.start();
    server.app.use(error.handleError);
  });

  after((done) => {
    server.stop(() => {
      done();
    });
  });

  it("should return displayId", function (done) {
    request.get('http://localhost:9494/displays')
      .ca(cert)
      .end(function(err, res) {
        expect(res.status).to.be.equal(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('object');
        expect(res.body.displayId).to.be.equal("abc123");
        done();
      });
  });
});
