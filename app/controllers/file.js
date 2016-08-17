const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const request = require("request");
const config = require("../../config/config");

const FileController = function(url) {
  "use strict";

  let fileName = config.downloadPath + path.sep;

  const download = (cb) => {
    if (url) {
      fileName += getFileName(url);
      let file = fs.createWriteStream(fileName);

      file.on("finish", () => {
        file.close(cb);
      }).on("error", (err) => {
        handleError(err, cb);
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
          handleError(err, cb);
        });
    }
  };

  const handleError = (err, cb) => {
    fs.unlink(fileName);

    if (cb) {
      cb(err);
    }
  };

  const getFileName = () => {
    let hash = "";

    if (url) {
      hash = crypto.createHash("md5").update(url).digest("hex");
    }

    return hash;
  };

  return {
    download: download
  };
};

module.exports = FileController;