"use strict";

const fs = require("fs"),
  chai = require("chai"),
  sinon = require("sinon"),
  Data = require("../../../app/models/data"),
  expect = chai.expect;

describe("Data", () => {
  let data;
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

    data = new Data({}, db);

  });

  it("should set the data object with properties and values", () => {
    let key = "testKey";
    let headers = {etag: "fefefe"};

    data.set("key", key);
    data.set("headers",headers)

    expect(data.data["key"]).to.equal(key);
    expect(data.data["headers"]).to.equal(headers);
  });

  it("should call db find with key when calling findByKey", () => {
    let dbFindSpy = sinon.spy(db, "find");
    let key = "testKey";

    data.findByKey(key);

    expect(dbFindSpy.args[0][0]).to.deep.equal({key: key});
  });

  it("should call db update when calling save", () => {
    let dbSaveSpy = sinon.spy(db, "update");
    let key = "testKey";
    let headers = {etag: "fefefe"};

    data.set("key", key);
    data.set("headers",headers)
    data.save();

    expect(dbSaveSpy.args[0][0]).to.deep.equal({key: key});
    expect(dbSaveSpy.args[0][1]).to.deep.equal({key: key, headers: headers});
    expect(dbSaveSpy.args[0][2]).to.deep.equal({upsert: true});
  });


  it("should call db remove when calling delete", () => {
    let dbRemoveSpy = sinon.spy(db, "remove");
    let key = "testKey";

    data.delete(key);

    expect(dbRemoveSpy.args[0][0]).to.deep.equal({key: key});
  });

});