var chai = require("chai"),
  chaiHttp = require("chai-http"),
  expect = chai.expect;

var config = require("../../config/config");
var server = require("../../app/server")(config);
var pkg = require("../../package.json");


chai.use(chaiHttp);

describe("Ping", function () {

  beforeEach(function () {
    server.start();
    require("../../app/controllers/ping")(server.app, pkg);
  });

  it("should return name and version", function (done) {
    chai.request('http://localhost:9494')
    .get('/')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.a('object');
      expect(res.body.name).to.be.equal(pkg.name);
      expect(res.body.version).to.be.equal(pkg.version);
      done();
    });
  });

  afterEach(function () {
    server.stop();
  });
});