"use strict";

const Datastore = require("nedb");

const DatabaseFactory = function(path, inMemoryOnly = false){

  this.db = new Datastore({ filename: path, autoload: true, timestampData: true, inMemoryOnly: inMemoryOnly });
};

module.exports = DatabaseFactory;