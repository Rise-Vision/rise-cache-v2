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
  this.pathInCache = fileSystem.getPathInCache(this.url);
  this.pathInDownload = fileSystem.getPathInDownload(this.url);
};

util.inherits(FileController, EventEmitter);

/* Read a file from disk. */
FileController.prototype.readFile = function() {
  let file = fs.createReadStream(this.pathInCache);

  file.on("error", (err) => {
    this.emit("file-error", err);
  });

  this.emit("read", file);
};

/* Write a file to disk. */
FileController.prototype.writeFile = function(res) {
  const file = fs.createWriteStream(this.pathInDownload);

  file.on("finish", () => {
    file.close(() => {
      this.saveHeaders(res.headers);
      this.moveFileFromDownloadToCache();
      this.emit("downloaded");
    });
  }).on("error", (err) => {
    this.handleWriteError("file-error", err);
  });

  res.pipe(file);
};

/* Move downloaded file form download folder to cache folder. */
FileController.prototype.moveFileFromDownloadToCache = function() {
  fileSystem.move(this.pathInDownload, this.pathInCache, (err) =>{
    if (err) this.emit("file-error", err);
  });
};

/* Handle error when writing to a file. */
FileController.prototype.handleWriteError = function(type, err) {
  fs.unlink(this.pathInDownload);
  this.emit(type, err);
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
