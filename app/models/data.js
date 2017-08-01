"use strict";

const Data = function (data, db) {
  this.data = data;
  this.db = db;
};

Data.prototype.set = function(name, value) {
  this.data[name] = value;
};

Data.prototype.findByKey = function (key, callback) {
  this.db.find({ key: key }, (err, docs) => {
    if (err) {
      return callback(err);
    }

    let data = (docs.length > 0) ? docs[0] : {};

    callback(null, new Data(data, this.db));
  });
};

Data.prototype.save = function(callback) {
  this.db.update({ key: this.data.key }, this.data, { upsert: true }, (err) => {
    if (err) {
      return callback(err);
    }

    callback(null, this.data);
  });
};

/* Update a particular field of the document. */
Data.prototype.update = function(field, callback) {
  this.db.update({ key: this.data.key }, { $set: field }, {}, (err, numAffected) => {
    if (err) {
      return callback(err);
    }

    callback(null, numAffected);
  });
};

Data.prototype.delete = function (key, callback) {
  this.db.remove({ key: key }, {}, (err, numRemoved) => {
    if (err) {
      return callback(err);
    }

    callback(null, numRemoved);
  });
};

Data.prototype.deleteOlderThanDate = function (date, callback) {
  this.db.find({}, (err, docs) => {
    if (err) {
      return callback(err);
    }

    if (docs.length > 0) {
      docs.forEach((item)=>{
        let updatedAtDate = new Date(item.updatedAt);
        if (updatedAtDate.getTime() < date) {
          this.delete(item.key, (err, numRemoved) => {
            if (err) {
              return callback(err);
            }
            callback(null, numRemoved, item.key);
          });
        }
      });
    }
  });
};

module.exports = Data;