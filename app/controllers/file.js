"use strict";

const fs = require("fs"),
  request = require("request"),
  fileSystem = require("../helpers/file-system"),
  EventEmitter = require("events").EventEmitter,
  util = require("util"),
  send = require("send");


const FileController = function(url, header, riseDisplayNetworkII) {
  EventEmitter.call(this);

  this.url = url;
  this.header = header;
  this.fileName = fileSystem.getFileName(this.url);
  this.pathInCache = fileSystem.getPathInCache(this.url);
  this.pathInDownload = fileSystem.getPathInDownload(this.url);
  this.riseDisplayNetworkII = riseDisplayNetworkII;
};

util.inherits(FileController, EventEmitter);

/* Download file and save to disk. */
FileController.prototype.downloadFile = function(opts) {
  let options = {},
    displayId = this.riseDisplayNetworkII.get("displayid");

  if (this.url) {

    options.url = this.url;

    if (displayId) {
      if (this.isStorageFile(options.url)) {
        // append the display id to the request url so that it is included in our storage logs for throttled analysis
        options.url = this.getUrlWithDisplayID(options.url, displayId);
      }
    }

    options.headers = {
      "User-Agent": "request"
    };

    options.proxy = this.riseDisplayNetworkII.get("proxy");

    if (opts) {
      Object.assign(options.headers, opts);
    }

    request.get(options)
      .on("response", (res) => {
        if (res.statusCode == 200) {
          this.writeFile(res);
          this.emit("downloading");
        }
        else if (res.statusCode == 304) {
          this.saveHeaders(res.headers);
        } else {
          this.emit("invalid-response", res.statusCode);
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

FileController.prototype.isStorageFile = function(url) {
  return decodeURIComponent(url).indexOf("storage.googleapis.com") > -1 ||
    decodeURIComponent(url).indexOf("googleapis.com/storage") > -1;
};

FileController.prototype.getUrlWithDisplayID = function (url, displayId) {
  return url + (url.indexOf("?") > -1 ? (url.slice(-1) == "&" ? "":"&") : "?" ) + "displayid=" + displayId;
};

module.exports = FileController;
