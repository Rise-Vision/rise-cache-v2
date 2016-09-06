"use strict";

const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  express = require("express"),
  fileSystem = require("./helpers/file-system");

const ServerFactory = function(config) {

  const app = express(),
    server =  http.createServer(app);

  const init = () => {
    fileSystem.createDir(config.downloadPath);
    fileSystem.createDir(config.cachePath);
    deleteUnusedFiles();
  };

  const start = () => {
    return server.listen(config.port, config.url, () => {
      console.info("Rise Cache is up and running on port: " + config.port);
    });
  };

  const stop = () => {
    server.close();
  };

  /* Delete any file that has not been used in 7 or more days. */
  const deleteUnusedFiles = () => {
    fs.readdir(config.cachePath, function(err, files) {
      if (err) {
        console.error("Could not read the " + config.cachePath + " directory.", err);
      } else {
        // Iterate over the files in the directory.
        files.forEach(function(file) {
          let filePath = path.join(config.cachePath, file);

          // Delete any unused files.
          fileSystem.isUnused(filePath, (isUnused) => {
            if (isUnused) {

              fileSystem.delete(filePath, (err) => {
                if (err) {
                  console.error(err, filePath);
                } else {
                  console.info("File deleted", filePath);
                }
              });

            }
          });

        });
      }
    });
  };

  return {
    init: init,
    start: start,
    stop: stop,
    app: app,
    server: server
  };
};

module.exports = ServerFactory;