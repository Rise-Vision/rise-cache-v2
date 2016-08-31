"use strict";
const EventEmitter = require("events").EventEmitter,
  util = require("util"),
  request = require("request"),
  fileSystem = require("../helpers/file-system");


const MetadataController = function(url, metadata) {
  EventEmitter.call(this);

  this.url = url;
  this.fileName = fileSystem.getFileName(this.url);
  this.metadata = metadata;
};

util.inherits(MetadataController, EventEmitter);

/* Get folder/file metadata and store it on db. */
MetadataController.prototype.getMetadata = function() {
  if (this.url) {
    const requestOptions = { method: "GET", uri: this.url, json: true };
    request(requestOptions, (err, res, body) => {
      if (err || res.statusCode != 200) {
        this.getCachedMetadata( (err, cachedRes) => {
          if(err) {
            this.emit("no-response");
            return this.emit("metadata-error", err);
          }

          if (cachedRes) {
            this.emit("response", cachedRes);
          } else {
            this.emit("no-response");
          }
        });
      } else {
        this.saveMetadata(body);
        this.emit("response", body);
      }
    });
  }
};

/* Save metadata to DB. */
MetadataController.prototype.saveMetadata = function(data) {

  this.metadata.set("key", this.fileName);
  this.metadata.set("metadata", data);

  this.metadata.save((err, newMetadata) => {
    if (err) return this.emit("metadata-error", err);
    this.emit("metadata", newMetadata);
  });
};

/* Get metadata to DB. */
MetadataController.prototype.getCachedMetadata = function(cb) {
  this.metadata.findByKey(this.fileName, (err, metadata) => {
    if (err) return cb(err);
    cb(null, metadata.data.metadata);
  });
};

module.exports = MetadataController;
