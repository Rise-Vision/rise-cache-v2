/*global DOWNLOAD_TOTAL_SIZE:true*/
"use strict";

const fs = require("fs-extra"),
  path = require("path"),
  crypto = require("crypto"),
  platform = require("rise-common-electron").platform,
  config = require("../../config/config"),
  URL = require("url"),
  querystring = require("querystring");

module.exports = {

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
    if (!url) return "";

    const STORAGE_API_HOST = "storage-dot-rvaserver2.appspot.com";
    const STORAGE_GOOGLEAPIS_HOST = "storage.googleapis.com";
    const GOOGLEAPIS_HOST = "www.googleapis.com";

    let token = url;
    let parsedUrlObj = URL.parse(url);

    if (parsedUrlObj.host == STORAGE_API_HOST) {
      let querystringObj = querystring.parse(parsedUrlObj.query);
      if (querystringObj.file) {
        token = querystringObj.file;
      }
    } else if (parsedUrlObj.host == STORAGE_GOOGLEAPIS_HOST) {
      let positionOfSecondSlash = parsedUrlObj.path.indexOf("/", 1);
      token = parsedUrlObj.path.substring(positionOfSecondSlash + 1);
    } else if (parsedUrlObj.host == GOOGLEAPIS_HOST) {
      let positionOfSlashBeforeFileName = parsedUrlObj.path.indexOf("/o/", 1);
      token = parsedUrlObj.path.substring(positionOfSlashBeforeFileName + 3);
    }

    return crypto.createHash("md5").update(unescape(token)).digest("hex");
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
  getAvailableSpace: function(logger, cb) {
    platform.getFreeDiskSpace(config.cachePath).then((space) => {
      cb(space);
    }).catch((err) => {
      logger.error(err);
      cb(false);
    });
  },

  isThereAvailableSpace: function(logger, cb, spaceOnDisk, fileSize=0) {
    if(spaceOnDisk) {
      let spaceLeft = spaceOnDisk - DOWNLOAD_TOTAL_SIZE - config.diskThreshold - fileSize;
      if (spaceLeft > 0) {
        cb(true);
      } else {
        logger.info(`spaceOnDisk: ${spaceOnDisk}, DOWNLOAD_TOTAL_SIZE: ${DOWNLOAD_TOTAL_SIZE}, diskThreshold: ${config.diskThreshold}, fileSize: ${fileSize}`);
        cb(false);
      }
    } else {
      cb(false);
    }
  },

  addToDownloadTotalSize: function(size=0) {
    DOWNLOAD_TOTAL_SIZE += parseInt(size);
  },

  removeFromDownloadTotalSize: function(size=0) {
    DOWNLOAD_TOTAL_SIZE -= parseInt(size);
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

  cleanupLogFile: function(logger) {
    this.fileExists(config.logFilePath, (exists) => {
      if ( exists ) {
        fs.truncate(config.logFilePath, 0, (err) => {
          if (err) {
            logger.error(err);
          }
        });
      }
    });
  },

  cleanupDownloadFolder: function() {
    fs.emptyDir(config.downloadPath, (err) =>{
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
