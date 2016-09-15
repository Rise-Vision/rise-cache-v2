"use strict";

const fs = require("fs"),
  path = require("path"),
  fileSystem = require("../helpers/file-system"),
  Header = require("../models/header"),
  Metadata = require("../models/metadata");


const CleanupJob = function(config, headerDB, metadataDB) {
  this.config = config;
  this.header = new Header({}, headerDB);
  this.metadata = new Metadata({}, metadataDB);
};

/* Delete any file that has not been used in 7 or more days. */
CleanupJob.prototype.run = function() {
  let self = this;
  fs.readdir(self.config.cachePath, function(err, files) {
    if (err) {
      console.error("Could not read the " + self.config.cachePath + " directory.", err);
    } else {
      // Iterate over the files in the directory.
      files.forEach(function(file) {
        let filePath = path.join(self.config.cachePath, file);

        // Delete any unused files with headers and metadata.
        fileSystem.isUnused(filePath, (isUnused) => {
          if (isUnused) {

            fileSystem.delete(filePath, (err) => {
              if (err) {
                console.error(err, filePath);
              } else {
                console.info("File deleted", filePath);
              }
            });

            // delete headers
            self.header.set("key", file);
            self.header.delete((err, numRemoved) => {
              if (err) {
                console.error(err, filePath);
              } else if (numRemoved > 0) {
                console.info("File headers deleted", filePath);
              }
            });

            // delete metadata
            self.metadata.set("key", file);
            self.metadata.delete((err, numRemoved) => {
              if (err) {
                console.error(err, filePath);
              } else if (numRemoved > 0) {
                console.info("File metadata deleted", filePath);
              }
            });

          }
        });

      });
    }
  });
};

module.exports = CleanupJob;