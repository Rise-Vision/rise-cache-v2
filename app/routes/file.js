"use strict";

const fileSystem = require("../helpers/file-system"),
  FileController = require("../controllers/file"),
  Header = require("../models/header"),
  url = require("url");

const FileRoute = function(app, proxy, headerDB) {

  app.get("/files", (req, res, next) => {
    const fileUrl = req.query.url;

    if (fileUrl) {
      const path = fileSystem.getPath(fileUrl),
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
          // TODO: Use proxy if file isDownloading.
          // req.on("proxyRes", (proxyRes) => {
          //   if (proxyRes.statusCode == 200) {
          //     controller.writeFile(proxyRes);
          //   }
          // });

          // req.on("proxyError", (err) => {
          //   res.statusCode = 500;
          //   next(err);
          // });

          // controller.on("downloaded", () => {
          //   console.info("File Downloaded", fileUrl, new Date());
          // });

          // proxyRequest(req, res, fileUrl);
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

  function proxyRequest(req, res, fileUrl) {
    let parsedUrl = url.parse(fileUrl);

    req.url = fileUrl;

    proxy.web(req, res, {
      prependPath: false,
      target: fileUrl,
      headers: {
        host: parsedUrl.hostname
      }
    });
  }
};

module.exports = FileRoute;