"use strict";

const EventEmitter = require("events").EventEmitter;
const util = require("util");

const DataController = function(model) {
  EventEmitter.call(this);

  this.model = model;
};

util.inherits(DataController, EventEmitter);

DataController.prototype.saveData = function(key, value) {
  this.model.set("key", key);
  this.model.set("value", value);

  this.model.save((err, newData) => {
    if (err) {
      return this.emit("save-data-error", err);
    }

    this.emit("save-data", newData);
  });
};

DataController.prototype.getData = function(key) {

  this.model.findByKey(key, (err, foundData) => {
    if (err) {
      return this.emit("get-data-error", err);
    }
    let data = foundData.data;

    if (Object.keys(data).length === 0 && data.constructor === Object) {
      data = null;
    }

    this.emit("get-data", data);
  });
};

DataController.prototype.deleteData = function(key) {
  this.model.delete(key, (err, numRemoved) => {
    if (err) {
      return this.emit("delete-data-error", err);
    }

    this.emit("delete-data", numRemoved);

  });
};

module.exports = DataController;
