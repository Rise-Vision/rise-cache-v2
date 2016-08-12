var chai = require("chai"),
  chaiHttp = require("chai-http"),
  server = require("../server.js");

chai.use(chaiHttp);