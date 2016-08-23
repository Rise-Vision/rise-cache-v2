"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Header = require("../models/header");

const FileRoute = function(app, proxy, headerDB) {

  app.get("/files", (req, res, next) => {
    const url = req.query.url;

    if (url) {
      const path = fileSystem.getPath(url),
        header = new Header({}, headerDB),
        controller = new FileController(url, header);

      controller.on("file-error", (err) => {
        res.statusCode = 500;
        next(err);
      });

      // Check if the file is cached.
      isCached(path, (cached) => {
        if (cached) {
          // Get file from disk and stream to client.
          controller.on("read", (file) => {
            file.pipe(res);
          });

          getFromCache(res, controller, url);
        } else {
          req.on("proxyRes", (proxyRes) => {
            if (proxyRes.statusCode == 200) {
              controller.writeFile(proxyRes);
            }
          });

          req.on("proxyError", (err) => {
            res.statusCode = 500;
            next(err);
          });

          controller.on("downloaded", () => {
            console.info("File Downloaded", url);
          });

          proxyRequest(req, res, url);
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

  function getFromCache(res, controller, url) {
    controller.readFile();
    console.info("File exists in cache. Not downloading", url);
  }

  function proxyRequest(req, res, url) {
    req.url = url;
    proxy.web(req, res, { target: url, prependPath: false });
  }
};

module.exports = FileRoute;