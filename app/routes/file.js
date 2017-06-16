"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Data = require("../models/data");

const FileRoute = function(app, headerDB, riseDisplayNetworkII, config, logger) {

  app.get("/files", (req, res, next) => {
    const fileUrl = req.query.url;

    if (fileUrl) {
      logger.info("Creating controller with url: " + fileUrl);

      const header = new Data({}, headerDB),
        controller = new FileController(fileUrl, header, riseDisplayNetworkII);

      controller.on("file-error", (err) => {
        res.statusCode = 500;
        next(err);
      });

      // Check if the file is cached.
      fileSystem.isCached(fileUrl, (cached) => {
        if (cached) {
          logger.info("File is cached: " + fileUrl);

          // Get file from disk and stream to client.
          controller.getHeaders((err, resp) => {
            let headers = resp.headers;

            if (err) {
              logger.error(err, null, fileUrl);
            }
            else if (!headers) {
              logger.error("No headers available", null, fileUrl);
            }

            logger.info("Sending file from cache");
            getFromCache(req, res, controller, fileUrl, headers);

            if (!resp.latest) {
              logger.info("File is not on latest version: " + fileUrl);

              // Check if the file is downloading.
              fileSystem.isDownloading(fileUrl, (downloading) => {
                if (downloading) {
                  sendDownloadingResponse(res, fileUrl);
                } else {
                  // get the appropriate header field for request
                  controller.getUpdateHeaderField((err, updateHeaderField) => {
                    if (err) { logger.error(err, null, fileUrl); }

                    downloadFile(res, controller, fileUrl, updateHeaderField);
                  });
                }
              });
            }
          });

        } else {
          logger.info("File is not cached: " + fileUrl);

          // Check if the file is downloading.
          fileSystem.isDownloading(fileUrl, (downloading) => {
            if (downloading) {
              sendDownloadingResponse(res, fileUrl);
            } else {
              downloadFile(res, controller, fileUrl);
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

  function downloadFile(res, controller, fileUrl, updateHeaderField) {
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

        controller.downloadFile(updateHeaderField);
      } else {
        logger.error("Insufficient disk space");
        sendResponse(res, 507, "Insufficient disk space");
      }
    });
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
