"use strict";

const Datastore = require("nedb");

const DatabaseFactory = function(path){

  this.db = new Datastore({ filename: path, autoload: true });
};

module.exports = DatabaseFactory;