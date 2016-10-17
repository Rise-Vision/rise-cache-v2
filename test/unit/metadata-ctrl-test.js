"use strict";

const chai = require("chai"),
  nock = require("nock"),
  sinon = require("sinon"),
  MetadataController = require("../../app/controllers/metadata"),
  expect = chai.expect,
  metadataResponse = require("../data/metadata.json");

describe("MetadataController", () => {
  let metadataController,
    metadata = {
      save: function () {
        return;
      },
      set: function () {

      },
      findByKey: function (key,cb) {
        cb(null, {data: {}});
      }
    };

  let riseDisplayNetworkII = {
    get: function (property) {
      if (property == "activeproxy") {
        return "";
      }
    }
  };

  let logger = {
    error: function (detail, errorDetail) {}
  };

  beforeEach(() => {
    metadataController = new MetadataController("https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F", metadata, riseDisplayNetworkII, logger);
  });

  describe("getMetadata", () => {

    after(() => {
      nock.cleanAll();
    });

    it("should get metadata from the server", (done) => {

      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(200, metadataResponse);

      metadataController.getMetadata();

      metadataController.on("response", (data) => {
        expect(data).to.deep.equal(metadataResponse);
        done();
      });
    });

    it("should get metadata without RiseDisplayNetworkII.ini file", (done) => {
      var controller = new MetadataController("https://storage-dot-rvaserver2.appspot.com/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F", metadata, null);

      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(200, metadataResponse);

      controller.getMetadata();

      controller.on("response", (data) => {
        expect(data).to.deep.equal(metadataResponse);
        done();
      });
    });

    it("should emit 'response' event", (done) => {
      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(200, metadataResponse);

      metadataController.getMetadata();

      metadataController.on("response", (data) => {
        expect(true).to.be.true;
        done();
      });
    });

    it("should log error if metadata server responds with an error", (done) => {
      let spy = sinon.spy(logger, "error");

      metadataController.on("no-response", () => {
        expect(spy.calledOnce).to.be.true;
        logger.error.restore();
        done();
      });

      metadataController.getMetadata();
    });

    it("should emit 'no-response' event if metadata server responds with an error", (done) => {
      metadataController.getMetadata();

      metadataController.on("no-response", () => {
        expect(true).to.be.true;

        done();
      });
    });

    it("should emit 'no-response' event if metadata server responds status code different than 200", (done) => {

      nock("https://storage-dot-rvaserver2.appspot.com")
        .get("/_ah/api/storage/v0.01/files?companyId=30007b45-3df0-4c7b-9f7f-7d8ce6443013%26folder=Images%2Fsdsu%2F")
        .reply(404);

      metadataController.getMetadata();

      metadataController.on("no-response", () => {
        expect(true).to.be.true;

        done();
      });
    });

    it("should emit 'no-response' event if there is an error when getting metadata from DB", (done) => {

      let errorMessage = "Error getting metadata from DB";

      metadata.findByKey = function (key,cb) {
        cb(new Error(errorMessage));
      };

      metadataController.getMetadata();

      metadataController.on("no-response", () => {
        expect(true).to.be.true;

        done();
      });
    });

    it("should emit metadata-error if there is an error when getting metadata from DB", (done) => {

      let errorMessage = "Error getting metadata from DB";

      metadata.findByKey = function (key,cb) {
        cb(new Error(errorMessage));
      };

      metadataController.getMetadata();

      metadataController.on("metadata-error", (err) => {
        expect(err.message).to.equal(errorMessage);

        done();
      });
    });

  });

  describe("saveMetadata", () => {

    it("should not set key if there is already metadata for it on db", () => {

      let metadataSaveSpy = sinon.spy(metadata, "save");

      metadataController.saveMetadata();

      expect(metadataSaveSpy.calledOnce).to.be.true;
    });

    it("should emit an error event if an error happens when saving metadata", (done) => {
      metadata.save = function (cb) {
        cb(new Error("ERROR"));
      };

      let metadataSaveSpy = sinon.spy(metadata, "save");

      metadataController.on("metadata-error", (err) => {
        expect(metadataSaveSpy.calledOnce).to.be.true;
        expect(err.message).to.equal("ERROR");
        done();
      });

      metadataController.saveMetadata();
    });

  });

  describe("getCachedMetadata", () => {

    it("should get the metadata from DB", (done) => {
      const newMetadata = {data: {key: "test", metadata: {etag: "etag"}}};
      metadata.findByKey = function (key, cb) {
        cb(null, newMetadata);
      };

      let metadataFindByKeySpy = sinon.spy(metadata, "findByKey");

      metadataController.getCachedMetadata( (err, foundMetadata) => {
        expect(metadataFindByKeySpy.calledOnce).to.be.true;
        expect(foundMetadata).to.deep.equal(newMetadata.data.metadata);
        done();
      });
    });

    it("should return an error if there is an error on getting headers from DB", (done) => {
      let errorMessage = "Error getting metadata from db";

      metadata.findByKey = function (key, cb) {
        cb(new Error(errorMessage));
      };

      let metadataFindByKeySpy = sinon.spy(metadata, "findByKey");

      metadataController.getCachedMetadata( (err, foundMetadata) => {
        expect(metadataFindByKeySpy.calledOnce).to.be.true;
        expect(foundMetadata).to.be.undefined;
        expect(err.message).to.equal(errorMessage);
        done();
      });
    });

  });
});