"use strict";

const fs = require("fs-extra"),
  path = require("path"),
  crypto = require("crypto"),
  diskusage = require("diskusage"),
  config = require("../../config/config");

module.exports = {

  createFile: function(filePath, cb) {
    fs.open(filePath, "w", function (err, descriptor) {
      if (err) {
        console.log(err);
      } else if (typeof cb === "function") {
          cb(descriptor);
        }
      }
    });
  },

  // Create directory if it does not already exist.
  createDir: function(dir) {
    fs.mkdirs(dir, (err) => {
      if (err) {
        // TODO: Directory could not be created.
      }
    });
  },

  fileExists: function(path, callback) {
    fs.stat(path, (err, stats) => {
      if (!err) {
        callback(true);
      }
      else {
        callback(false);
      }
    });
  },

  move: function(from, to, cb) {
    fs.move(from, to, {clobber: true}, cb);
  },

  /* Delete a file. */
  delete: function(path, cb) {
    fs.unlink(path, (err) => {
      if (err) {
        cb(err);
      } else {
        cb();
      }
    });
  },

  getFileName: function(url) {
    return url ? crypto.createHash("md5").update(url).digest("hex") : "";
  },

  getPathInDownload: function(url) {
    return path.join(config.downloadPath, this.getFileName(url));
  },

  getPathInCache: function(url) {
    return path.join(config.cachePath, this.getFileName(url));
  },

  /* Get the last access time of a file. */
  getAccessTime: function(path, cb) {
    fs.stat(path, (err, stats) => {
      if (!err) {
        cb(stats.atime);
      } else {
        cb(null);
      }
    });
  },

  /* Get the available amount of disk space. */
  getAvailableSpace: function(cb) {
    diskusage.check(config.cachePath, function (err, info) {
      if (err) {
        console.error(err);
      } else {
        cb(info.available);
      }
    });
  },

  isCached: function(url, cb) {
    this.fileExists(this.getPathInCache(url), (exists) => {
      cb(exists);
    });
  },

  isDownloading: function(url, cb) {
    this.fileExists(this.getPathInDownload(url), (exists) => {
      cb(exists);
    });
  },

  /* Check if a file has not been accessed within the past 7 days. */
  isUnused: function(path, cb) {
    this.getAccessTime(path, (accessTime) => {
      if (accessTime) {
        let now = new Date(),
          lastWeek = now.setDate(now.getDate() - 7);

        cb(accessTime.getTime() <= lastWeek);
      } else {
        cb(false);
      }
    });
  },

  cleanupLogFile: function() {
    fs.truncate(config.logFilePath, 0, (err) => {
      if (err && config.debugging) {
        console.error(err);
      }
    });
  },

  appendToLog: function(datetime, message) {
    fs.appendFile(config.logFilePath, datetime + " - " + message + "\n", (err) => {
      if (err && config.debugging) {
        console.error(err);
      }
    });
  }

};
