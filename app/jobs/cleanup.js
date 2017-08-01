"use strict";

const fs = require("fs"),
  path = require("path"),
  fileSystem = require("../helpers/file-system"),
  Data = require("../models/data");

const CleanupJob = function(config, headerDB, metadataDB, financialDB, spreadsheetDB, rssDB, logger) {
  this.config = config;
  this.header = new Data({}, headerDB);
  this.metadata = new Data({}, metadataDB);
  this.financial = new Data({}, financialDB);
  this.spreadsheet = new Data({}, spreadsheetDB);
  this.rss = new Data({}, rssDB);
  this.logger = logger;
};

/* Delete any file that has not been used in 7 or more days. */
CleanupJob.prototype.run = function() {
  fs.readdir(this.config.cachePath, (err, files) => {
    let fileCount = 0;

    if (err) {
      this.logger.error("Could not read the " + this.config.cachePath + " directory.", err);
    } else {
      this.logger.info("Cleanup job started");

      // Iterate over the files in the directory.
      files.forEach((file) => {
        let filePath = path.join(this.config.cachePath, file);

        // Delete any unused files with headers and metadata.
        fileSystem.isUnused(filePath, (isUnused) => {
          if (isUnused) {

            fileSystem.delete(filePath, (err) => {
              if (err) {
                this.logger.error(err, null, filePath, file);
              } else {
                this.logger.info("File deleted", filePath, file);
              }
            });

            // delete headers
            this.header.set("key", file);
            this.header.delete(file, (err, numRemoved) => {
              if (err) {
                this.logger.error(err, null, filePath, file);
              } else if (numRemoved > 0) {
                this.logger.info("File headers deleted", filePath, file);
              }
            });

            // delete metadata
            this.metadata.set("key", file);
            this.metadata.delete(file, (err, numRemoved) => {
              if (err) {
                this.logger.error(err, null, filePath, file);
              } else if (numRemoved > 0) {
                this.logger.info("File metadata deleted", filePath, file);
              }

              fileCount++;

              this.logJobEnded(fileCount, files.length);
            });

          } else {
            fileCount++;
          }

          this.logJobEnded(fileCount, files.length);
        });

      });
    }
  });

  this.cleanUpDatabases();

};

CleanupJob.prototype.cleanUpDatabases = function() {
  let date = new Date();

  date = date.getTime() - this.config.timeDataLimit;

  this.financial.deleteOlderThanDate(date, (err, numRemoved, key)=>{
    if (err) {
      this.logger.error(err, key);
    } else if (numRemoved > 0) {
      this.logger.info("Financial data deleted", key);
    }
  });

  this.spreadsheet.deleteOlderThanDate(date, (err, numRemoved, key)=>{
    if (err) {
      this.logger.error(err, key);
    } else if (numRemoved > 0) {
      this.logger.info("Spreadsheet data deleted", key);
    }
  });

  this.rss.deleteOlderThanDate(date, (err, numRemoved, key)=>{
    if (err) {
      this.logger.error(err, key);
    } else if (numRemoved > 0) {
      this.logger.info("Rss data deleted", key);
    }
  });

};

/* Log that cleanup job has ended if all files have been processed. */
CleanupJob.prototype.logJobEnded = function(count, total) {
  if (count === total) {
    this.logger.info("Cleanup job ended");
  }
};

module.exports = CleanupJob;
