import express from "express";
import config from "./config/config";
import { download } from "./app/file";
import { createDirectory } from "./app/helpers/file-system";
import { errorHandler } from "./app/middleware/error";

const app = express(),
  port = process.env.PORT || 9494;

app.get("/", (req, res, next) => {
  let url = req.query.url;

  if (url) {
    // Download the file.
    download(url, (err, statusCode) => {
      if (err) {
        res.statusCode = statusCode || 500;
        next(err);
      }
      else {
        // TODO: Return file.
        res.sendStatus(200);
      }
    });
  }
  else {
    res.statusCode = 400;
    next(new Error("Missing url parameter"));
  }
});

app.use(errorHandler);

function init() {
  createDirectory(config.downloadPath);
}

init();

app.listen(port, "localhost");
console.log("Listening on port " + port);