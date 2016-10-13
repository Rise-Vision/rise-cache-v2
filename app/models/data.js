"use strict";

const Data = function (data, db) {
  this.data = data;
  this.db = db;
};

Data.prototype.set = function(name, value) {
  this.data[name] = value;
};

Data.prototype.save = function(callback) {
  this.db.update({ key: this.data.key }, this.data, { upsert: true }, (err) => {
    if (err) {
      return callback(err);
    }

    callback(null, this.data);
  });

};

module.exports = Data;