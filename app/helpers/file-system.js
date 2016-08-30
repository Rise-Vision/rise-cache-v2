const fs = require("fs-extra"),
  path = require("path"),
  crypto = require("crypto"),
  config = require("../../config/config");

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

  getFileName: function(url) {
    return url ? crypto.createHash("md5").update(url).digest("hex") : "";
  },

  getPathInDownload: function(url) {
    return path.join(config.downloadPath, this.getFileName(url));
  },

  getPathInCache: function(url) {
    return path.join(config.cachePath, this.getFileName(url));
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
  }

};
