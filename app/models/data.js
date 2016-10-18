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

Data.prototype.findByKey = function (key, callback) {
  this.db.find({key: key}, (err, docs) => {
    if (err) return callback(err);
    let data = (docs.length > 0) ? docs[0] : {};
    callback(null, new Data(data, this.db));
  });
};

module.exports = Data;