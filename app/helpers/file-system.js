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

  getFileName: function(url) {
    return url ? crypto.createHash("md5").update(url).digest("hex") : "";
  },

  getPath: function(url) {
    return config.downloadPath + path.sep + this.getFileName(url);
  }

};