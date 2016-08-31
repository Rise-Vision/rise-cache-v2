"use strict";

const fs = require("fs"),
  chai = require("chai"),
  sinon = require("sinon"),
  Metadata = require("../../app/models/metadata"),
  expect = chai.expect;

describe("Metadata", () => {
  let metadata;
  let db = {
    find: function () {
      return;
    },
    update: function () {
      return;
    },
    remove: function () {
      return;
    }
  };

  beforeEach(() => {

    metadata = new Metadata({}, db);

  });

  it("should set the data object with properties and values", () => {
    let key = "testKey";
    let md = {etag: "fefefe"};
    metadata.set("key", key);
    metadata.set("metadata",md)

    expect(metadata.data["key"]).to.equal(key);
    expect(metadata.data["metadata"]).to.equal(md);
  });

  it("should get the properties and values from the data object", () => {
    let key = "testKey";
    let md = {etag: "fefefe"};
    metadata.set("key", key);
    metadata.set("metadata",md);

    expect(metadata.get("key")).to.equal(key);
    expect(metadata.get("metadata")).to.deep.equal(md);
  });


  it("should call db find with key when calling findByKey", () => {
    let dbFindSpy = sinon.spy(db, "find");
    let key = "testKey";
    metadata.findByKey(key);

    expect(dbFindSpy.args[0][0]).to.deep.equal({key: key});
  });

  it("should call db update when calling save", () => {
    let dbSaveSpy = sinon.spy(db, "update");
    let key = "testKey";
    let md = {etag: "fefefe"};
    metadata.set("key", key);
    metadata.set("metadata",md)
    metadata.save();

    expect(dbSaveSpy.args[0][0]).to.deep.equal({key: key});
    expect(dbSaveSpy.args[0][1]).to.deep.equal({key: key, metadata: md});
    expect(dbSaveSpy.args[0][2]).to.deep.equal({upsert: true});
  });


  it("should call db remove when calling delete", () => {
    let dbRemoveSpy = sinon.spy(db, "remove");
    let key = "testKey";
    metadata.set("key", key);
    metadata.delete();

    expect(dbRemoveSpy.args[0][0]).to.deep.equal({key: key});
  });

});