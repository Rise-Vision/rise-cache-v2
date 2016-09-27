"use strict";

const fs = require("fs"),
  path = require("path"),
  fileSystem = require("../helpers/file-system"),
  Header = require("../models/header"),
  Metadata = require("../models/metadata");


const CleanupJob = function(config, headerDB, metadataDB, logger) {
  this.config = config;
  this.header = new Header({}, headerDB);
  this.metadata = new Metadata({}, metadataDB);
  this.logger = logger;
};

/* Delete any file that has not been used in 7 or more days. */
CleanupJob.prototype.run = function() {
  fs.readdir(this.config.cachePath, (err, files) => {
    if (err) {
      this.logger.error("Could not read the " + this.config.cachePath + " directory.", err);
    } else {
      this.logger.info("Cleanup job started at " + new Date());

      // Iterate over the files in the directory.
      files.forEach((file) => {
        let filePath = path.join(this.config.cachePath, file);

        // Delete any unused files with headers and metadata.
        fileSystem.isUnused(filePath, (isUnused) => {
          if (isUnused) {

            fileSystem.delete(filePath, (err) => {
              if (err) {
                this.logger.error(err, filePath);
              } else {
                this.logger.info("File deleted", filePath);
              }
            });

            // delete headers
            this.header.set("key", file);
            this.header.delete((err, numRemoved) => {
              if (err) {
                this.logger.error(err, filePath);
              } else if (numRemoved > 0) {
                this.logger.info("File headers deleted", filePath);
              }
            });

            // delete metadata
            this.metadata.set("key", file);
            this.metadata.delete((err, numRemoved) => {
              if (err) {
                this.logger.error(err, filePath);
              } else if (numRemoved > 0) {
                this.logger.info("File metadata deleted", filePath);
              }
            });

          }
        });

      });

      this.logger.info("Cleanup job ended at " + new Date());
    }
  });
};

module.exports = CleanupJob;
