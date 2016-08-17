var chai = require("chai"),
  chaiHttp = require("chai-http"),
  expect = chai.expect;

var config = require("../config/config");
var server = require("../app/server")(config);


chai.use(chaiHttp);

describe("Ping", function () {

  beforeEach(function () {
    server.start();
    var pkg = {name: "rise-cache-v2", version: "1.0.0"}
    require("../app/controllers/ping")(server.app, pkg);
  });

  it('should return name and version', function (done) {
    chai.request('http://localhost:9494')
    .get('/')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.a('object');
      expect(res.body.name).to.be.equal('rise-cache-v2');
      expect(res.body.version).to.be.equal('1.0.0');
      done();
    });
  });

  afterEach(function () {
    server.stop();
  });
});