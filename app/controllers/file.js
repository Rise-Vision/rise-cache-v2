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

/* Download file and save to disk. */
FileController.prototype.downloadFile = function() {
  if (this.url) {
    let file = fs.createWriteStream(this.path);

    file.on("finish", () => {
      file.close(() => {
        this.emit("downloaded");
      });
    }).on("error", (err) => {
      this.handleDownloadError("file-error", err);
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
        this.handleDownloadError("request-error", err);
      });
  }
};

/* Read a file from disk. */
FileController.prototype.readFile = function() {
  let file = fs.createReadStream(this.path);

  file.on("error", (err) => {
    this.emit("file-error", err);
  });

  this.emit("read", file);
};

/* Handle error when downloading a file. */
FileController.prototype.handleDownloadError = function(type, err) {
  fs.unlink(this.path);
  this.emit(type, err);
};

module.exports = FileController;
