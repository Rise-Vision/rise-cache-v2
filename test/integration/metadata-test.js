"use strict";

const nock = require("nock"),
  mock = require("mock-fs"),
  expect = require('chai').expect,
  config = require("../../config/config"),
  Database = require("../../app/database"),
  metadataResponse = require("../data/metadata.json"),
  httpProxy = require('http-proxy'),
  cert = config.httpsOptions.cert;

let request = require("superagent");
request = request.agent({ca: cert});

describe("/metadata endpoint", () => {
  let metadataDB = null;
  let logger = {
    info: function (x){},
    error:function (x){},
    warn: function (x){}
  };
  let gcsListener = {
    registerPath: function(path) {}
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

    metadataDB = new Database(config.metadataDBPath);
    require("../../app/routes/metadata")(server.app, metadataDB.db, riseDisplayNetworkII, gcsListener, logger);
    server.start();
    server.app.use(error.handleError);
  });

  after((done) => {
    mock.restore();
    server.stop(() => {
      done();
    });
  });

  describe("get metadata", () => {

    afterEach(() => {
      nock.cleanAll();
    });

    it("should return 200 with metadata", (done) => {
      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(200, metadataResponse);

      request.get("http://localhost:9494/metadata")
        .query({ url: "https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal(metadataResponse);

          done();
        });
    });

    it("should return error if url parameter is missing", (done) => {
      request.get("http://localhost:9494/metadata")
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body).to.deep.equal({ status: 400, message: "Missing url parameter" });

          done();
        });
    });

    it("should return cached metadata if error happen when getting from storage", (done) => {

      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(404);

      request.get("http://localhost:9494/metadata")
        .query({ url: "https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res.status).to.equal(200);
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

      request.get("http://localhost:9494/metadata")
        .query({ url: "https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res.status).to.equal(502);
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

      request.get("http://localhost:9494/metadata")
        .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal(metadataResponse);

          done();
        });
    });

    it("should return cached metadata if error happen when getting from storage", (done) => {

      nock("http://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(404);

      request.get("http://localhost:9494/metadata")
        .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res.status).to.equal(200);
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

      request.get("http://localhost:9494/metadata")
        .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
        .end((err, res) => {
          expect(res.status).to.equal(502);
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

        request.get("http://localhost:9494/metadata")
          .query({ url: "http://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F" })
          .end((err, res) => {
            expect(res.status).to.equal(502);
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
