import fs from "fs";
import path from "path";
import crypto from "crypto";
import request from "request";
import config from "../config/config";

// Download file and save to disk.
export function download(url, cb) {
  if (url) {
    let fileName = config.downloadPath + path.sep + getFileName(url),
      file = fs.createWriteStream(fileName);

    file.on("finish", () => {
      file.close(cb);
    }).on("error", (err) => {
      handleError(fileName, err, cb);
    });

    // Download the file.
    request.get(url)
      .on("response", (res) => {
        if (res.statusCode !== 200) {
          fs.unlink(fileName);

          if (cb) {
            cb(new Error("Invalid url parameter"), res.statusCode);
          }
        }
        else {
          res.pipe(file);
        }
      })
      .on("error", (err) => {
        handleError(fileName, err, cb);
      });
  }
}

function handleError(fileName, err, cb) {
  // TODO: Log it.
  fs.unlink(fileName);

  if (cb) {
    cb(err);
  }
}

function getFileName(url) {
  let hash = "";

  if (url) {
    hash = crypto.createHash("md5").update(url).digest("hex");
  }

  return hash;
}