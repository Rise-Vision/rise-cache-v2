var chai = require("chai"),
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