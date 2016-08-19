"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file");

const FileRoute = function(app) {

  app.get("/files", (req, res, next) => {
    const url = req.query.url;

    if (url) {
      const path = fileSystem.getPath(url),
        fileController = new FileController(url, path);

      // An error occurred either reading or writing the file.
      fileController.on("file-error", (err) => {
        res.statusCode = 500;
        next(err);
      });

      // Check whether or not the file already exists.
      fileSystem.fileExists(path, (exists) => {
        if (exists) {
          // Get file from disk and stream to client.
          fileController.on("read", (file) => {
            file.pipe(res);
          });

          fileController.readFile();
        } else {
          // Download the file.
          fileController.downloadFile();

          fileController.on("request-error", (err) => {
            console.error(err, url);
            res.statusCode = 500;
            next(err);
          });

          fileController.on("stream", (resFromDownload) => {
            const statusCode = resFromDownload.statusCode || 500;
            res.writeHead(statusCode, resFromDownload.headers);
            resFromDownload.pipe(res);
          });

          fileController.on("downloaded", () => {
            console.info("File Downloaded", url);
          });
        }
      });
    }
    else {
      res.statusCode = 400;
      next(new Error("Missing url parameter"));
    }
  });

};

module.exports = FileRoute;