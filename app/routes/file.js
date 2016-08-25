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
          controller.on("read", (file) => {

            // Get file headers before streaming.
            controller.getHeaders((err, headers) => {

              if (err) {
                console.error(err, fileUrl, new Date());
              }

              if (headers) {
                const statusCode = 200;
                res.writeHead(statusCode, headers);
              }

              file.pipe(res);
            });
          });

          getFromCache(res, controller, fileUrl);

          // check if file is stale
          controller.isStale(updateDuration, (err, stale) => {

            if (err) {
              console.error(err, fileUrl);
            }

            if (stale) {

              controller.getHeaders((err, headers) => {
                if (err) { console.error(err, fileUrl); }

                //TODO: request file again using request library, not proxy
                console.log("Request file from server again adding 'If-None-Match' header with etag value", headers.etag);
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
                res.statusCode = 500;

                console.error(err, fileUrl, new Date());
                next(err);
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

  function getFromCache(res, controller, fileUrl) {
    controller.readFile();
    console.info("File exists in cache. Not downloading", fileUrl, new Date());
  }

  function sendResponse(res, fileUrl) {
    res.status(202)
      .send({
        status: "202",
        message: "File is downloading"
      });

    console.info("File is downloading", fileUrl, new Date());
  }
};

module.exports = FileRoute;