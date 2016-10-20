"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Data = require("../models/data");

const FileRoute = function(app, headerDB, riseDisplayNetworkII, config, logger) {

  app.get("/files", (req, res, next) => {
    const fileUrl = req.query.url;

    if (fileUrl) {
      const header = new Data({}, headerDB),
        controller = new FileController(fileUrl, header, riseDisplayNetworkII);

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
              logger.error(err, fileUrl);
            }
            else {
              if (!headers) {
                logger.error("No headers available", fileUrl);
              }
            }
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "no-cache");

            getFromCache(req, res, controller, fileUrl, headers);

          });

          // check if file is stale
          controller.isStale(config.fileUpdateDuration, (err, stale) => {

            if (err) {
              logger.error(err, fileUrl);
            }

            if (stale) {

              // Check if the file is downloading.
              fileSystem.isDownloading(fileUrl, (downloading) => {
                if (!downloading) {

                  // get the appropriate header field for request
                  controller.getUpdateHeaderField((err, field) => {
                    if (err) { logger.error(err, fileUrl); }

                    controller.on("downloaded", () => {
                      logger.info("File downloaded - " + fileUrl);
                    });

                    controller.on("request-error", (err) => {
                      logger.error(err, fileUrl);
                    });

                    controller.on("move-file-error", (err) => {
                      logger.error(err, fileUrl);
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
              // Check if there's enough disk space.
              fileSystem.getAvailableSpace(logger, (availableSpace) => {
                // Download the file.
                if (availableSpace > config.diskThreshold) {
                  controller.on("downloaded", () => {
                    logger.info("File downloaded - " + fileUrl);
                  });

                  controller.on("downloading", () => {
                    sendDownloadingResponse(res, fileUrl);
                  });

                  controller.on("invalid-response", (statusCode) => {
                    sendInvalidResponseResponse(res, fileUrl, statusCode);
                  });

                  controller.on("request-error", (err) => {
                    logger.error(err, fileUrl);
                    sendResponse(res, 504, "File's host server could not be reached", fileUrl);
                  });

                  controller.on("move-file-error", (err) => {
                    logger.error(err, fileUrl);
                  });

                  controller.on("delete-file-error", (err) => {
                    logger.error(err, fileUrl);
                  });

                  controller.downloadFile();
                } else {
                  logger.info("Insufficient disk space");
                  sendResponse(res, 507, "Insufficient disk space");
                }
              });
            }
          });
        }
      });
    } else {
      res.statusCode = 400;
      next(new Error("Missing url parameter"));
    }
  });

  function getFromCache(req, res, controller, fileUrl, headers) {
    controller.streamFile(req, res, headers);
    logger.info("File exists in cache. Not downloading - " + fileUrl);
  }

  function sendInvalidResponseResponse(res, fileUrl, statusCode) {
    logger.info("Invalid response with status code " + statusCode + " - " + fileUrl);

    if (statusCode === 404) {
      sendResponse(res, 534, "File not found on the host server", fileUrl);
    } else {
      sendResponse(res, 502, "File's host server returned an invalid response with status code: " + statusCode, fileUrl);
    }
  }

  function sendDownloadingResponse(res, fileUrl) {
    sendResponse(res, 202, "File is downloading", fileUrl);
    logger.info("File is downloading - " + fileUrl);
  }

  function sendResponse(res, statusCode, message, fileUrl) {
    res.status(statusCode)
      .send({
        status: statusCode,
        message: message
      });
  }
};

module.exports = FileRoute;