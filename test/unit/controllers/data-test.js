"use strict";

const chai = require("chai"),
  DataController = require("../../../app/controllers/data"),
  spreadsheetData = require("../../data/spreadsheets.json"),
  expect = chai.expect;

describe("DataController", () => {
  let controller,
    model = {
      save: function(cb) {
        cb(null, spreadsheetData);
      },
      set: function(name, value) {},
      findByKey: function(key, cb) {
        cb(null,{
          data: spreadsheetData
        });
      },
      delete: function(key, cb) {
        cb(null, 1);
      }
    };

  beforeEach(() => {
    controller = new DataController(model);
  });

  describe("saveData", () => {

    it("should emit 'save-data' event if data was saved", (done) => {
      controller.on("save-data", (data) => {
        expect(data).to.deep.equal(spreadsheetData);

        done();
      });

      controller.saveData(spreadsheetData.key, spreadsheetData.value);
    });

    it("should emit 'save-data-error' event if data was not saved", (done) => {
      model.save = function (cb) {
        cb(new Error("err"));
      };

      controller.on("save-data-error", (err) => {
        expect(err.message).to.equal("err");

        done();
      });

      controller.saveData(spreadsheetData.key, spreadsheetData.value);
    });

  });

  describe("getData", () => {

    it("should emit 'get-data' event if data was found", (done) => {
      controller.on("get-data", (data) => {
        expect(data).to.deep.equal(spreadsheetData);

        done();
      });

      controller.getData(spreadsheetData.key);
    });

    it("should emit 'get-data-error' event if data could not be retrieved", (done) => {
      model.findByKey = function (key, cb) {
        cb(new Error("err"));
      };

      controller.on("get-data-error", (err) => {
        expect(err.message).to.equal("err");

        done();
      });

      controller.getData(spreadsheetData.key);
    });

  });

  describe("deleteData", () => {
    it("should emit 'delete-data' event if data was deleted", (done) => {
      controller.on("delete-data", (numRemoved) => {
        expect(numRemoved).to.equal(1);

        done();
      });

      controller.deleteData(spreadsheetData.key);
    });

    it("should emit 'delete-data' event if no data was deleted", (done) => {
      model.delete = function (key, cb) {
        cb(null, 0);
      };

      controller.on("delete-data", (numRemoved) => {
        expect(numRemoved).to.equal(0);

        done();
      });

      controller.deleteData(spreadsheetData.key);
    });

    it("should emit 'delete-data-error' event if problem deleting the data", (done) => {
      model.delete = function (key, cb) {
        cb(new Error("err"));
      };

      controller.on("delete-data-error", (err) => {
        expect(err.message).to.equal("err");

        done();
      });

      controller.deleteData(spreadsheetData.key);
    });
  });

});