"use strict";

const fs = require("fs"),
  request = require("request"),
  config = require("../../config/config"),
  fileSystem = require("../helpers/file-system"),
  EventEmitter = require("events").EventEmitter,
  util = require("util");


const FinancialsController = function(url, riseDisplayNetworkII, logger) {
  EventEmitter.call(this);

  this.url = url;
  this.fileName = fileSystem.getFileName(this.url);
  this.pathInCache = fileSystem.getPathInCache(this.url);
  this.pathInDownload = fileSystem.getPathInDownload(this.url);
  this.riseDisplayNetworkII = riseDisplayNetworkII;
  this.logger = logger;
};

util.inherits(FinancialsController, EventEmitter);

FinancialsController.prototype.getData = function(opts) {
  let options = {};

  if ( this.url ) {
    options.url = this.url;

    options.headers = {
      "User-Agent": "request"
    };
    options.proxy = (this.riseDisplayNetworkII) ?
      (this.riseDisplayNetworkII.get("activeproxy") || this.riseDisplayNetworkII.get("rcosproxy")) :
      null;
    options.timeout = config.requestTimeout;

    if (opts) {
      Object.assign(options.headers, opts);
    }

    fileSystem.getAvailableSpace(this.logger, (spaceInDisk)=>{
      request(options, (error, res, body) => {
        if (error || res.statusCode != 200) {
          this.getSavedData((err, data) => {
            if (err) { this.logger.error(err, null, this.url); }

            if (data) {
              this.emit("data", data);
            } else {
              if (error) {
                this.emit("request-error", error);
              } else {
                this.emit("invalid-response", res.statusCode);
              }
            }
          });

        } else {
          let fileSize = res.headers["content-length"];

          if (!spaceInDisk) {
            // proceed as normal with saving data
            this.initiateSaveData(body, fileSize);
          } else {
            fileSystem.isThereAvailableSpace(this.logger, (isThereAvailableSpace) => {
              if (isThereAvailableSpace) {
                this.initiateSaveData(body, fileSize);
              } else {
                this.logger.error("Insufficient disk space", fileSize, this.url);
              }

              this.emit("data", body);

            }, spaceInDisk, fileSize);
          }
        }
      });
    });

  }
};

FinancialsController.prototype.initiateSaveData = function(body, fileSize) {
  fileSystem.addToDownloadTotalSize(fileSize);
  this.saveData(body, fileSize);
};

FinancialsController.prototype.saveData = function(body, fileSize) {
  fs.writeFile(this.pathInDownload, body, (err) => {
    if (err) {
      this.deleteFileFromDownload();
      this.emit("file-error", err);
    } else {
      this.moveFileFromDownloadToCache();
      this.emit("saved");
    }

    fileSystem.removeFromDownloadTotalSize(fileSize);
  });
};

FinancialsController.prototype.getSavedData = function(cb) {
  fileSystem.isCached(this.url, (cached) => {
    if (!cached) { return cb(); }

    fs.readFile(this.pathInCache, (err, data) => {
      if (err) return cb(err);

      return cb(null, data);
    });
  });
};

/* Move downloaded file form download folder to cache folder. */
FinancialsController.prototype.moveFileFromDownloadToCache = function() {
  fileSystem.move(this.pathInDownload, this.pathInCache, (err) =>{
    if (err) this.emit("move-file-error", err);
  });
};

FinancialsController.prototype.deleteFileFromDownload = function() {
  fileSystem.fileExists(this.pathInDownload, (exists) =>{
    if (exists) {
      fileSystem.delete(this.pathInDownload, (err) => {
        if (err) this.emit("delete-file-error", err);
      });
    }
  });

};

module.exports = FinancialsController;
