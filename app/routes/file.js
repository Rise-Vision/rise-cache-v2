"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Header = require("../models/header");

const FileRoute = function(app, headerDB, updateDuration, riseDisplayNetworkII) {

  app.get("/files", (req, res, next) => {
    const fileUrl = req.query.url;

    if (fileUrl) {
      const header = new Header({}, headerDB),
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
              console.error(err, fileUrl);
            }
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Cache-Control", "no-cache");

            getFromCache(req, res, controller, fileUrl, headers);

          });

          // check if file is stale
          controller.isStale(updateDuration, (err, stale) => {

            if (err) {
              console.error(err, fileUrl);
            }

            if (stale) {

              // Check if the file is downloading.
              fileSystem.isDownloading(fileUrl, (downloading) => {
                if (!downloading) {

                  // get the appropriate header field for request
                  controller.getUpdateHeaderField((err, field) => {
                    if (err) { console.error(err, fileUrl); }

                    controller.on("downloaded", () => {
                      console.info("Latest File Downloaded", fileUrl, new Date());
                    });

                    controller.on("request-error", (err) => {
                      console.error(err, fileUrl, new Date());
                    });

                    controller.on("move-file-error", (err) => {
                      console.error(err, fileUrl, new Date());
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
              // Download the file.
              controller.on("downloaded", () => {
                console.info("File Downloaded", fileUrl, new Date());
              });

              controller.on("downloading", () => {
                sendDownloadingResponse(res, fileUrl);
              });

              controller.on("invalid-response", (statusCode) => {
                sendInvalidResponseResponse(res, fileUrl, statusCode);
              });

              controller.on("request-error", (err) => {
                console.error(err, fileUrl, new Date());
                sendResponse(res, 504, "File's host server could not be reached", fileUrl);
              });

              controller.on("move-file-error", (err) => {
                console.error(err, fileUrl, new Date());
              });

              controller.downloadFile();
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
    console.info("File exists in cache. Not downloading", fileUrl, new Date());
  }

  function sendInvalidResponseResponse(res, fileUrl, statusCode) {
    console.info("Invalid Response with status code: ", statusCode, fileUrl, new Date());

    if (statusCode === 404) {
      sendResponse(res, 534, "File not found on the host server", fileUrl);
    } else {
      sendResponse(res, 502, "File's host server returned an invalid response with status code: " + statusCode, fileUrl);
    }
  }

  function sendDownloadingResponse(res, fileUrl) {
    sendResponse(res, 202, "File is downloading", fileUrl);
    console.info("File is downloading", fileUrl, new Date());
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