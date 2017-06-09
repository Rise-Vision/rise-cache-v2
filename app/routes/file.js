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
              logger.error(err, null, fileUrl);
            }
            else {
              if (!headers) {
                logger.error("No headers available", null, fileUrl);
              }
            }

            getFromCache(req, res, controller, fileUrl, headers);

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

                  controller.downloadFile();
                } else {
                  logger.error("Insufficient disk space");
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
