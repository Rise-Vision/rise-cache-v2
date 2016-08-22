"use strict";

const fs = require("fs"),
  chai = require("chai"),
  sinon = require("sinon"),
  Header = require("../../app/models/header"),
  expect = chai.expect;

describe("Header", () => {
  let header;
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

    header = new Header({}, db);

  });

  it("should set the data object with properties and values", () => {
    let key = "testKey";
    let headers = {etag: "fefefe"};
    header.set("key", key);
    header.set("headers",headers)

    expect(header.data["key"]).to.equal(key);
    expect(header.data["headers"]).to.equal(headers);
  });

  it("should get the properties and values from the data object", () => {
    let key = "testKey";
    let headers = {etag: "fefefe"};
    header.set("key", key);
    header.set("headers",headers);

    expect(header.get("key")).to.equal(key);
    expect(header.get("headers")).to.deep.equal(headers);
  });


  it("should call db find with key when calling findByKey", () => {
    let dbFindSpy = sinon.spy(db, "find");
    let key = "testKey";
    header.findByKey(key);

    expect(dbFindSpy.args[0][0]).to.deep.equal({key: key});
  });

  it("should call db update when calling save", () => {
    let dbSaveSpy = sinon.spy(db, "update");
    let key = "testKey";
    let headers = {etag: "fefefe"};
    header.set("key", key);
    header.set("headers",headers)
    header.save();

    expect(dbSaveSpy.args[0][0]).to.deep.equal({key: key});
    expect(dbSaveSpy.args[0][1]).to.deep.equal({key: key, headers: headers});
    expect(dbSaveSpy.args[0][2]).to.deep.equal({upsert: true});
  });


  it("should call db remove when calling delete", () => {
    let dbRemoveSpy = sinon.spy(db, "remove");
    let key = "testKey";
    header.set("key", key);
    header.delete();

    expect(dbRemoveSpy.args[0][0]).to.deep.equal({key: key});
  });

});