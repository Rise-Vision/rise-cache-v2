"use strict";

const nock = require("nock"),
  mock = require("mock-fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  Database = require("../../app/database"),
  expect = chai.expect,
  metadataResponse = require("../data/metadata.json"),
  httpProxy = require('http-proxy');

chai.use(chaiHttp);

describe("/metadata endpoint", () => {
  let metadataDB = null;
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
    }
  };

  before(() => {
    mock({
      [config.metadataDBPath]: ""
    });
    metadataDB = new Database(config.metadataDBPath);
    require("../../app/routes/metadata")(server.app, metadataDB.db, riseDisplayNetworkII, logger);
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

  after(() => {
    mock.restore();
    nock.cleanAll();
  });

  describe("get metadata", () => {

    afterEach(() => {
      nock.cleanAll();
    });

    it("should return 200 with metadata", (done) => {
      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(200, metadataResponse);

      chai.request("http://localhost:9494")
        .get("/metadata")
        .query({ url: "https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.deep.equal(metadataResponse);

          done();
        });
    });

    it("should return error if url parameter is missing", (done) => {
      chai.request("http://localhost:9494")
        .get("/metadata")
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.deep.equal({ status: 400, message: "Missing url parameter" });

          done();
        });
    });

    it("should return cached metadata if error happen when getting from storage", (done) => {

      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(404);

      chai.request("http://localhost:9494")
        .get("/metadata")
        .query({ url: "https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.deep.equal(metadataResponse);

          done();
        });
    });

    it("should return 502 with no metadata found when there is no metadata cached and it cannot also be got from storage", (done) => {

      mock({
        [config.metadataDBPath]: ""
      });

      metadataDB.db.loadDatabase();

      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(404);

      chai.request("http://localhost:9494")
        .get("/metadata")
        .query({ url: "https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res).to.have.status(502);
          expect(res.body).to.deep.equal({
            status: 502,
            message: "Could not get metadata from storage server"
          });

          done();
        });
    });
  });


  describe("get metadata through proxy server", () => {
    let proxy;
    before(() => {
      proxy = httpProxy.createProxyServer({target:'http://storage-dot-rvaserver2.appspot.com'}).listen(8080);
    });

    after(() => {
      proxy.close();
    });

    beforeEach(() => {
      riseDisplayNetworkII.get = function (property) {
        if (property == "activeproxy") {
          return "http://localhost:8080";
        }
      };
    });

    it("should return 200 with metadata", (done) => {
      nock("http://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(200, metadataResponse);

      chai.request("http://localhost:9494")
        .get("/metadata")
        .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.deep.equal(metadataResponse);

          done();
        });
    });

    it("should return cached metadata if error happen when getting from storage", (done) => {

      nock("http://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(404);

      chai.request("http://localhost:9494")
        .get("/metadata")
        .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.deep.equal(metadataResponse);

          done();
        });
    });

    it("should return 502 with no metadata found when there is no metadata cached and it cannot also be got from storage", (done) => {

      mock({
        [config.metadataDBPath]: ""
      });

      metadataDB.db.loadDatabase();

      nock("http://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(404);

      chai.request("http://localhost:9494")
        .get("/metadata")
        .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res).to.have.status(502);
          expect(res.body).to.deep.equal({
            status: 502,
            message: "Could not get metadata from storage server"
          });

          done();
        });
    });

    describe("Not Reachable proxy server", () => {

      beforeEach(()=> {
        riseDisplayNetworkII.get = function (property) {
          if (property == "activeproxy") {
            return "http://localhost:8081";
          }
        };
      });

      it("should not get metadata if proxy server can't be reached", (done) => {

        chai.request("http://localhost:9494")
          .get("/metadata")
          .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
          .end((err, res) => {
            expect(res).to.have.status(502);
            expect(res.body).to.deep.equal({
              status: 502,
              message: "Could not get metadata from storage server"
            });

            done();
          });
      });
    });
  });
});
