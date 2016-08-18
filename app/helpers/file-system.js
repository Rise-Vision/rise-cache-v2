const mkdirp = require("mkdirp");

// Create directory if it does not already exist.
module.exports = {
  createDir: function(dir) {
    mkdirp(dir, (err) => {
      if (err) {
        // TODO: Directory could not be created.
      }
    });
  }
};