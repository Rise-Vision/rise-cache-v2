"use strict";
const EventEmitter = require("events").EventEmitter,
  util = require("util"),
  request = require("request"),
  fileSystem = require("../helpers/file-system"),
  latestRequestByUrl = {};

const MetadataController = function(url, metadata, riseDisplayNetworkII, gcsListener, logger) {
  EventEmitter.call(this);

  this.url = url;
  this.fileName = fileSystem.getFileName(this.url);
  this.metadata = metadata;
  this.riseDisplayNetworkII = riseDisplayNetworkII;
  this.gcsListener = gcsListener;
  this.logger = logger;
};

util.inherits(MetadataController, EventEmitter);

/* Get folder/file metadata and store it on db. */
MetadataController.prototype.getMetadata = function() {
  if (this.url) {
    const requestOptions = {
      method: "GET",
      url: this.url,
      json: true,
      proxy: (this.riseDisplayNetworkII) ? this.riseDisplayNetworkII.get("activeproxy"): null
    };

    this.getCachedMetadata((err, cachedRes) => {
      if(err) {
        this.emit("no-response");
        return this.emit("metadata-error", err);
      }
      else if (!this.metadataNeedsRefresh(this.url, cachedRes)) {
        this.logger.info("Using cached version of", this.url);
        this.emit("response", cachedRes.metadata);
      }
      else {
        this.logger.info("Loading new version of", this.url);
        this.gcsListener.registerPath(this.url);

        request(requestOptions, (err, res, body) => {
          if (err || res.statusCode != 200) {
            this.logger.error(err, null, this.url);

            if(cachedRes.metadata) {
              this.logger.info("Using cached version (after failure) of", this.url);
              this.emit("response", cachedRes.metadata);
            }
            else {
              this.emit("no-response");
              this.emit("metadata-error", err);
            }
          } else {
            latestRequestByUrl[this.url] = new Date();
            this.saveMetadata(body);
            this.emit("response", body);
          }
        });
      }
    });
  }
};

/* Save metadata to DB. */
MetadataController.prototype.saveMetadata = function(data) {
  this.metadata.set("key", this.fileName);
  this.metadata.set("metadata", data);
  this.metadata.set("latest", true);

  this.metadata.save((err, newMetadata) => {
    if (err) return this.emit("metadata-error", err);
    this.emit("metadata", newMetadata);
  });
};

/* Get metadata to DB. */
MetadataController.prototype.getCachedMetadata = function(cb) {
  this.metadata.findByKey(this.fileName, (err, metadata) => {
    if (err) return cb(err);
    cb(null, metadata.data);
  });
};

// Added to handle offline Messaging Service (downgrade to polling)
MetadataController.prototype.metadataNeedsRefresh = function(url, cachedRes) {
  let latestCheck = latestRequestByUrl[url];

  if(this.gcsListener.isOnline()) {
    return !cachedRes.metadata || !cachedRes.latest;
  }
  else {
    this.logger.info("Metadata may require polling: " + url);
    return !latestCheck || (Date.now() - latestCheck.getTime()) > 5 * 60 * 1000;
  }
};

module.exports = MetadataController;
