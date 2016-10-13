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

module.exports = DataController;
