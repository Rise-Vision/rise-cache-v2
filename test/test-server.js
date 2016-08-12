var chai = require("chai"),
  chaiHttp = require("chai-http");

chai.use(chaiHttp);

describe("Loading", function () {
  var server;

  beforeEach(function () {
    server = require("../server.js");
  });

  afterEach(function () {
    server.close();
  });
});