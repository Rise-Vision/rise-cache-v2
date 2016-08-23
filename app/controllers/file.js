"use strict";

const fs = require("fs"),
  fileSystem = require("../helpers/file-system"),
  request = require("request"),
  EventEmitter = require("events").EventEmitter,
  util = require("util");

const FileController = function(url, header) {
  EventEmitter.call(this);

  this.url = url;
  this.header = header;
  this.path = fileSystem.getPath(this.url);
};

util.inherits(FileController, EventEmitter);

/* Download file and save to disk. */
FileController.prototype.downloadFile = function() {
  if (this.url) {

    const fileName = fileSystem.getFileName(this.url);
    let file = fs.createWriteStream(this.path);
    let headers = "";
    
    file.on("finish", () => {
      file.close(() => {
        this.saveHeaders(headers, fileName);
        this.emit("downloaded");
      });
    }).on("error", (err) => {
      this.handleDownloadError("file-error", err);
    });

    // Download the file.
    request.get(this.url)
      .on("response", (res) => {
        if (res.statusCode == 200) {
          headers = res.headers;
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
  console.log(this.path);
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

FileController.prototype.saveHeaders = function(headers, fileName) {
  this.header.set("key", fileName);
  this.header.set("headers", headers);

  this.header.save((err, newHeader) => {
    if (err) return this.emit("headers-error", err);
    this.emit("headers", newHeader);
  });
};

module.exports = FileController;
