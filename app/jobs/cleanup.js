"use strict";

const fs = require("fs"),
  path = require("path"),
  fileSystem = require("../helpers/file-system"),
  Data = require("../models/data");

const CleanupJob = function(config, headerDB, metadataDB, financialDB, spreadsheetDB, rssDB, logger) {
  this.config = config;
  this.header = new Data({}, headerDB, logger);
  this.metadata = new Data({}, metadataDB, logger);
  this.financial = new Data({}, financialDB, logger);
  this.spreadsheet = new Data({}, spreadsheetDB, logger);
  this.rss = new Data({}, rssDB, logger);
  this.logger = logger;
};

CleanupJob.prototype.callbackCount = -1;

/* Delete any file that has not been used in 7 or more days. */
CleanupJob.prototype.run = function(mainCallback) {
  this.logger.info("Cleanup job started");

  fs.readdir(this.config.cachePath, (err, files) => {

    if (err) {
      this.logger.error("Could not read the " + this.config.cachePath + " directory.", err);
    } else {

      // Iterate over the files in the directory.
      files.forEach((file) => {
        let filePath = path.join(this.config.cachePath, file);

        // Delete any unused files with headers and metadata.
        fileSystem.isUnused(filePath, (isUnused) => {
          if (isUnused) {

            this.callbackCount++;
            fileSystem.delete(filePath, (err) => {
              if (err) {
                this.logger.error(err, null, filePath, file);
              } else {
                this.logger.info("File deleted", filePath, file);
              }
              this.logJobEnded(mainCallback);
            });

            this.callbackCount++;
            // delete headers
            this.header.set("key", file);
            this.header.delete(file, (err, numRemoved) => {
              if (err) {
                this.logger.error(err, null, filePath, file);
              } else if (numRemoved > 0) {
                this.logger.info("File headers deleted", filePath, file);
              }
              this.logJobEnded(mainCallback);
            });

            this.callbackCount++;
            // delete metadata
            this.metadata.set("key", file);
            this.metadata.delete(file, (err, numRemoved) => {
              if (err) {
                this.logger.error(err, null, filePath, file);
              } else if (numRemoved > 0) {
                this.logger.info("File metadata deleted", filePath, file);
              }
              this.logJobEnded(mainCallback);
            });

          }
        });

      });
    }
  });

  this.cleanUpDatabases(mainCallback);

};

CleanupJob.prototype.cleanUpDatabases = function(mainCallback) {
  let date = new Date();
  date = date.getTime() - this.config.timeDataLimit;

  this.callbackCount++;
  this.financial.deleteOlderThanDate(date, (err, numRemoved, key)=>{
    if (err) {
      this.logger.error(err, key);
    }
    this.logJobEnded(mainCallback);
  });

  this.callbackCount++;
  this.spreadsheet.deleteOlderThanDate(date, (err, numRemoved, key)=>{
    if (err) {
      this.logger.error(err, key);
    }
    this.logJobEnded(mainCallback);
  });

  this.callbackCount++;
  this.rss.deleteOlderThanDate(date, (err, numRemoved, key)=>{
    if (err) {
      this.logger.error(err, key);
    }
    this.logJobEnded(mainCallback);
  });

};

/* Log that cleanup job has ended if all files have been processed. */
CleanupJob.prototype.logJobEnded = function(mainCallback) {
  if (!this.callbackCount) {
    this.logger.info("Cleanup job ended");
    mainCallback();
  } else {
    this.callbackCount--;
  }
};

module.exports = CleanupJob;
