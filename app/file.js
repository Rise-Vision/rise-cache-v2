import fs from "fs";
import path from "path";
import crypto from "crypto";
import request from "request";
import config from "../config/config";

// Download file and save to disk.
export function download(url, cb) {
  let fileName = getFileName(url);

  if (fileName) {
    let encryptedFileName = getEncryptedFileName(fileName),
      file = fs.createWriteStream(config.downloadPath + path.sep + encryptedFileName);

    file.on("finish", () => {
      file.close(cb);
    }).on("error", (err) => {
      handleError(encryptedFileName, err, cb);
    });

    // Download the file.
    request.get(url)
      .on("response", (res) => {
        if (res.statusCode !== 200) {
          if (cb) {
            cb(new Error("Invalid url parameter"), res.statusCode);
          }
        }
        else {
          res.pipe(file);
        }
      })
      .on("error", (err) => {
        handleError(encryptedFileName, err, cb);
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
  return url.split("/").pop();
}

function getEncryptedFileName(fileName) {
  let hash = "";

  if (fileName) {
    hash = crypto.createHash("md5").update(fileName).digest("hex");
  }

  return hash;
}