"use strict";

const fs = require("fs"),
  request = require("request"),
  EventEmitter = require("events").EventEmitter,
  util = require("util");

const FileController = function(url, path) {
  EventEmitter.call(this);

  this.url = url;
  this.path = path;
};

util.inherits(FileController, EventEmitter);

FileController.prototype.downloadFile = function() {
  if (this.url) {
    let file = fs.createWriteStream(this.path);

    file.on("finish", () => {
      file.close(() => {
        this.emit("downloaded");
      });
    }).on("error", (err) => {
      this.handleDownloadError(err, "file-error");
    });

    // Download the file.
    request.get(this.url)
      .on("response", (res) => {
        if (res.statusCode == 200) {
          res.pipe(file);
        } else {
          fs.unlink(this.path);
        }

        this.emit("stream", res);
      })
      .on("error", (err) => {
        this.handleDownloadError(err, "request-error");
      });
  }
};

FileController.prototype.handleDownloadError = function(err, type) {
  fs.unlink(this.path);
  this.emit(type, err);
};

module.exports = FileController;
