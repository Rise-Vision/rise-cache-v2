"use strict";

const FileController = require("../controllers/file");

const FileRoute = function(app) {

  app.get("/files", (req, res, next) => {
    const url = req.query.url;

    if (url) {
      const fileController = new FileController(url);
      
      // Download the file.
      fileController.download();

      fileController.on("request-error", (err) => {
        console.error(err, url);
        res.statusCode = 500;
        next(err);
      });

      fileController.on("file-error", (err) => {
        console.error(err, url);
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
    else {
      res.statusCode = 400;
      next(new Error("Missing url parameter"));
    }
  });

};

module.exports = FileRoute;