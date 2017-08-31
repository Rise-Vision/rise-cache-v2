"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Data = require("../models/data"),
  URL_QUERY = "?url=";

const FileRoute = function(app, headerDB, riseDisplayNetworkII, config, logger) {

  app.get("/files", (req, res, next) => {
    if (!req.url.includes(URL_QUERY)) {
      res.statusCode = 400;
      return next(new Error("Missing url parameter"));
    }

    let fileUrl = req.url.split(URL_QUERY)[1];

    if (fileUrl.startsWith("https%3A%2F%2F")) {
      fileUrl = fileUrl.replace("https%3A%2F%2F");
    }

    if (fileUrl.startsWith("http%3A%2F%2F")) {
      fileUrl = fileUrl.replace("http%3A%2F%2F");
    }

    const header = new Data({}, headerDB),
      controller = new FileController(fileUrl, header, riseDisplayNetworkII, logger);

    controller.on("file-error", (err) => {
      res.statusCode = 500;
      next(err);
    });

    // Check if the file is cached.
    fileSystem.isCached(fileUrl, (cached) => {
      if (cached) {
        // Get file from disk and stream to client.
        controller.getHeaders((err, headers) => {

          if (err) {
            logger.error(err, null, fileUrl);
          }
          else {
            if (!headers) {
              logger.error("No headers available", null, fileUrl);
            }
          }

          getFromCache(req, res, controller, fileUrl, headers);

        });

        // check if file is stale
        controller.isStale(config.fileUpdateDuration, (err, stale) => {

          if (err) {
            logger.error(err, null, fileUrl);
          }

          if (stale) {

            // Check if the file is downloading.
            fileSystem.isDownloading(fileUrl, (downloading) => {
              if (!downloading) {

                // get the appropriate header field for request
                controller.getUpdateHeaderField((err, field) => {
                  if (err) { logger.error(err, null, fileUrl); }

                  controller.on("headers-error", (err) => {
                    logger.error("Could not save headers", err, fileUrl);
                  });

                  controller.on("downloaded", () => {
                    logger.info("File downloaded", fileUrl);
                  });

                  controller.on("request-error", (err) => {
                    logger.error(err, null, fileUrl);
                  });

                  controller.on("move-file-error", (err) => {
                    logger.error(err, null, fileUrl);
                  });

                  // Make request to download file passing request header
                  controller.downloadFile(field);
                });

              }
            });
          }
        });

      } else {
        // Check if the file is downloading.
        fileSystem.isDownloading(fileUrl, (downloading) => {
          if (downloading) {
            sendDownloadingResponse(res, fileUrl);
          } else {
            fileSystem.getAvailableSpace(logger, (spaceInDisk)=>{
              // Check if there's enough disk space.
              fileSystem.isThereAvailableSpace(logger, (isThereAvailableSpace) => {
                if (isThereAvailableSpace) {
                  // Download the file.

                  controller.on("headers-error", (err) => {
                    logger.error("Could not save headers", err, fileUrl);
                  });

                  controller.on("downloaded", () => {
                    logger.info("File downloaded", fileUrl);
                  });

                  controller.on("downloading", () => {
                    sendDownloadingResponse(res, fileUrl);
                  });

                  controller.on("invalid-response", (statusCode) => {
                    sendInvalidResponseResponse(res, fileUrl, statusCode);
                  });

                  controller.on("request-error", (err) => {
                    logger.error(err, null, fileUrl);
                    sendResponse(res, 504, "File's host server could not be reached", fileUrl);
                  });

                  controller.on("move-file-error", (err) => {
                    logger.error(err, null, fileUrl);
                  });

                  controller.on("delete-file-error", (err) => {
                    logger.error(err, null, fileUrl);
                  });

                  controller.on("insufficient-disk-space", (fileSize) => {
                    logger.error("Insufficient disk space", fileSize, fileUrl);
                    sendResponse(res, 507, "Insufficient disk space");
                  });

                  controller.downloadFile();
                } else {
                  logger.error("Insufficient disk space", null, fileUrl);
                  sendResponse(res, 507, "Insufficient disk space");
                }
              }, spaceInDisk);
            });
          }
        });
      }
    });
  });

  function getFromCache(req, res, controller, fileUrl, headers) {
    controller.streamFile(req, res, headers);
    logger.info("File exists in cache. Not downloading", fileUrl);
  }

  function sendInvalidResponseResponse(res, fileUrl, statusCode) {
    logger.error("Invalid response with status code " + statusCode, null, fileUrl);

    if (statusCode === 404) {
      sendResponse(res, 534, "File not found on the host server", fileUrl);
    } else {
      sendResponse(res, 502, "File's host server returned an invalid response with status code: " + statusCode, fileUrl);
    }
  }

  function sendDownloadingResponse(res, fileUrl) {
    sendResponse(res, 202, "File is downloading", fileUrl);
    logger.info("File is downloading", fileUrl);
  }

  function sendResponse(res, statusCode, message, fileUrl) {
    if (!res.headersSent) {
      res.status(statusCode)
        .send({
          status: statusCode,
          message: message
        });
    }
  }
};

module.exports = FileRoute;
