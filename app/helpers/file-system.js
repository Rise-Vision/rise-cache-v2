const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  mkdirp = require("mkdirp"),
  config = require("../../config/config");

module.exports = {

  // Create directory if it does not already exist.
  createDir: function(dir) {
    mkdirp(dir, (err) => {
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

  getFileName: function(url) {
    return url ? crypto.createHash("md5").update(url).digest("hex") : "";
  },

  getPath: function(url) {
    return path.join(config.downloadPath, this.getFileName(url));
  }

};
