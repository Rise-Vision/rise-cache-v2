"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Header = require("../models/header");

const FileRoute = function(app, headerDB, updateDuration) {

  app.get("/files", (req, res, next) => {
    const fileUrl = req.query.url;

    if (fileUrl) {
      const path = fileSystem.getPathInCache(fileUrl),
        header = new Header({}, headerDB),
        controller = new FileController(fileUrl, header);

      controller.on("file-error", (err) => {
        res.statusCode = 500;
        next(err);
      });

      // Check if the file is cached.
      isCached(path, (cached) => {
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
          // Download the file.
          controller.on("request-error", (err) => {
            res.statusCode = 500;

            console.error(err, fileUrl, new Date());
            next(err);
          });

          controller.on("stream", (downloadRes) => {
            const statusCode = downloadRes.statusCode || 500;

            res.writeHead(statusCode, downloadRes.headers);
            downloadRes.pipe(res);
          });

          controller.on("downloaded", () => {
            console.info("File Downloaded", fileUrl, new Date());
          });

          controller.downloadFile();
        }
      });
    } else {
      res.statusCode = 400;
      next(new Error("Missing url parameter"));
    }
  });

  function isCached(path, cb) {
    fileSystem.fileExists(path, (exists) => {
      cb(exists);
    });
  }

  function getFromCache(res, controller, fileUrl) {
    controller.readFile();
    console.info("File exists in cache. Not downloading", fileUrl, new Date());
  }
};

module.exports = FileRoute;