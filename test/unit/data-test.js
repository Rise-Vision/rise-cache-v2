"use strict";

const chai = require("chai"),
  DataController = require("../../app/controllers/data"),
  spreadsheetData = require("../data/spreadsheets.json"),
  expect = chai.expect;

describe("DataController", () => {
  let controller,
    model = {
      save: function(cb) {
        cb(null, spreadsheetData);
      },
      set: function(name, value) {}
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

      controller.saveData();
    });

    it("should emit 'save-data-error' event if data was not saved", (done) => {
      model.save = function (cb) {
        cb(new Error("err"), spreadsheetData);
      };

      controller.on("save-data-error", (err) => {
        expect(err.message).to.equal("err");

        done();
      });

      controller.saveData();
    });

  });

});