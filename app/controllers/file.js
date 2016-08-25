"use strict";

const fs = require("fs"),
  request = require("request"),
  fileSystem = require("../helpers/file-system"),
  EventEmitter = require("events").EventEmitter,
  util = require("util"),
  send = require("send");

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
FileController.prototype.streamFile = function(req, res, headers) {

  const option = {
    acceptRanges: true,
    cacheControl: true,
    etag: false,
    lastModified: false,
    maxAge:0
  };

  send(req, this.pathInCache, option)
  .on("error", (err) => {
    this.emit("file-error", err);
  })
  .on("headers", (res) => {
    if (headers) {
      if (headers["content-type"]) {
        res.setHeader("Content-Type", headers["content-type"]);
      }
      if (headers["etag"]) {
        res.setHeader("ETag", headers["etag"]);
      }
      if (headers["last-modified"]) {
        res.setHeader("Last-Modified", headers["last-modified"]);
      }
    }
  })
  .pipe(res);
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

FileController.prototype.getUpdateHeaderField = function(cb) {
  this.getHeaders((err, headers) => {
    if (err) return cb(err);

    let header = {};

    // prioritize using etag
    if (headers.hasOwnProperty("etag") && headers.etag !== "") {
      header["If-None-Match"] = headers.etag;
    }
    else if (headers.hasOwnProperty("last-modified")) {
      header["If-Modified-Since"] = headers["last-modified"];
    }

    return cb(null, header);

  });
};

module.exports = FileController;
