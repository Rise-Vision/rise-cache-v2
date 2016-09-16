const chai = require("chai"),
  chaiHttp = require("chai-http"),
  expect = chai.expect,
  mock = require("mock-fs");


const app = require("../../app/app")();
const config = require("../../config/config");
const pkg = require("../../package.json");

chai.use(chaiHttp);

describe("Ping", function () {

  beforeEach(function () {
    mock({
      [config.headersDBPath]: "",
      [config.metadataDBPath]: "",
      [config.downloadPath]: {},
      [config.cachePath]: {},
      [config.riseDisplayNetworkIIPath]: ""
    });
    app.start();
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

});