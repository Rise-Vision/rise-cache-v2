"use strict";

const fs = require("fs"),
  request = require("request"),
  fileSystem = require("../helpers/file-system"),
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

/* Download file and save to disk. */
FileController.prototype.downloadFile = function() {
  if (this.url) {
    request.get(this.url)
      .on("response", (res) => {
        if (res.statusCode == 200) {
          this.writeFile(res);
        }
      })
      .on("error", (err) => {
        this.emit("request-error", err);
      });
  }
};

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
    fs.unlink(this.pathInDownload);
    this.emit("file-error", err);
  });

  res.pipe(file);
};

/* Move downloaded file form download folder to cache folder. */
FileController.prototype.moveFileFromDownloadToCache = function() {
  fileSystem.move(this.pathInDownload, this.pathInCache, (err) =>{
    if (err) this.emit("move-file-error", err);
  });
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

FileController.prototype.getTimestampData = function(cb) {
  this.header.findByKey(this.fileName, (err, newHeader) => {
    if (err) return cb(err);
    cb(null, {
      createdAt: newHeader.data.createdAt,
      updatedAt: newHeader.data.updatedAt
    });
  });
};

FileController.prototype.isStale = function(updateDuration, cb) {
  this.getTimestampData((err, timestamp) => {
    if (err) return cb(err);

    let now = new Date(),
      passed = new Date(now - updateDuration),
      prev;

    if (err) return cb(err);

    // use the updatedAt time from previous last save of headers
    prev = new Date(timestamp.updatedAt);

    cb(null, prev < passed);
  });
};

module.exports = FileController;
