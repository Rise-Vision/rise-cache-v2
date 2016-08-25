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
  this.fileName = fileSystem.getFileName(this.url);
  this.path = fileSystem.getPath(this.url);
};

util.inherits(FileController, EventEmitter);

/* Download file and save to disk. */
FileController.prototype.downloadFile = function() {
  if (this.url) {
    request.get(this.url)
      .on("response", (res) => {
        if (res.statusCode == 200) {
          this.writeFile(res);
        }

        this.emit("stream", res);
      })
      .on("error", (err) => {
        this.emit("request-error", err);
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

/* Write a file to disk. */
FileController.prototype.writeFile = function(res) {
  const file = fs.createWriteStream(this.path);

  file.on("finish", () => {
    file.close(() => {
      this.saveHeaders(res.headers, this.fileName);
      this.emit("downloaded");
    });
  }).on("error", (err) => {
    fs.unlink(this.path);
    this.emit("file-error", err);
  });

  res.pipe(file);
};

FileController.prototype.saveHeaders = function(headers) {
  this.header.set("key", this.fileName);
  this.header.set("headers", headers);

  this.header.save((err, newHeader) => {
    if (err) return this.emit("headers-error", err);
    this.emit("headers", newHeader);
  });
};

FileController.prototype.getHeaders = function(cb) {
  this.header.findByKey(this.fileName, (err, newHeader) => {
    if (err) return cb(err);
    cb(null, newHeader.data.headers);
  });
};

module.exports = FileController;
