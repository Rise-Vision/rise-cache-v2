"use strict";

const Metadata = function (data, db) {
  this.data = data;
  this.db = db;
};

Metadata.prototype.get = function (name) {
  return this.data[name];
};

Metadata.prototype.set = function (name, value) {
  this.data[name] = value;
};

Metadata.prototype.findByKey = function (key, callback) {
  this.db.find({key: key}, (err, docs) => {
    if (err) return callback(err);
    let data = (docs.length > 0) ? docs[0] : {};
    callback(null, new Metadata(data, this.db));
  });
};

Metadata.prototype.save = function (callback) {
  const self = this;
  this.db.update({key: this.data.key}, this.data, {upsert: true}, (err) => {
    if (err) return callback(err);
    callback(null, self);
  });

};

Metadata.prototype.delete = function (callback) {
  this.db.remove({ key: this.data.key }, {}, function (err, numRemoved) {
    if (err) return callback(err);
    callback(null, numRemoved);
  });
};

module.exports = Metadata;