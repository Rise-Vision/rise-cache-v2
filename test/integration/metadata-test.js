"use strict";

const nock = require("nock"),
  mock = require("mock-fs"),
  chai = require("chai"),
  chaiHttp = require("chai-http"),
  config = require("../../config/config"),
  server = require("../../app/server")(config),
  error = require("../../app/middleware/error"),
  Database = require("../../app/database"),
  expect = chai.expect,
  metadataResponse = require("../data/metadata.json");

chai.use(chaiHttp);

describe("/metadata endpoint", () => {
  let metadata = {etag:"1a42b4479c62b39b93726d793a2295ca"};
  let metadataDB = null;

  before(() => {
    mock({
      [config.metadataDBPath]: ""
    });
    metadataDB = new Database(config.metadataDBPath);
    require("../../app/routes/metadata")(server.app, metadataDB.db);

    server.init();
  });

  beforeEach(() => {
    server.start();
    server.app.use(error.handleError);
  });

  afterEach(() => {
    server.stop();
  });

  after(() => {
    mock.restore();
  });

  describe("get metadata", () => {

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

    it("should return 404 with no metadata found when there is no metadata cached and it cannot also be got from storage", (done) => {

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
          expect(res).to.have.status(404);
          expect(res.body).to.deep.equal({
            status: 404,
            message: "No metadata found"
          });

          done();
        });
    });
  });
});