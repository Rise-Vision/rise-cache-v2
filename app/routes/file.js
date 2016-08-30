"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Header = require("../models/header");

const FileRoute = function(app, headerDB, updateDuration) {

  app.get("/files", (req, res, next) => {
    const fileUrl = req.query.url;

    if (fileUrl) {
      const header = new Header({}, headerDB),
        controller = new FileController(fileUrl, header);

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
              sendResponse(res, fileUrl);
            } else {
              // Download the file.
              controller.on("downloaded", () => {
                console.info("File Downloaded", fileUrl, new Date());
              });

              controller.on("request-error", (err) => {
                console.error(err, fileUrl, new Date());
              });

              controller.on("move-file-error", (err) => {
                console.error(err, fileUrl, new Date());
              });

              controller.downloadFile();
              sendResponse(res, fileUrl);
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

  function sendResponse(res, fileUrl) {
    res.status(202)
      .send({
        status: 202,
        message: "File is downloading"
      });

    console.info("File is downloading", fileUrl, new Date());
  }
};

module.exports = FileRoute;