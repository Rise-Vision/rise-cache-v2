"use strict";

const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  request = require("request"),
  config = require("../../config/config");

const FileController = function() {
  let _url = "",
    _fileName = config.downloadPath + path.sep;

  const setUrl = (url) => {
    _url = url;
  };

  const download = (cb) => {
    if (_url) {
      _fileName += getFileName(_url);
      let file = fs.createWriteStream(_fileName);

      file.on("finish", () => {
        file.close(cb);
      }).on("error", (err) => {
        handleError(err, cb);
      });

      // Download the file.
      request.get(_url)
        .on("response", (res) => {
          if (res.statusCode !== 200) {
            fs.unlink(_fileName);

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
    fs.unlink(_fileName);

    if (cb) {
      cb(err);
    }
  };

  const getFileName = () => {
    let hash = "";

    if (_url) {
      hash = crypto.createHash("md5").update(_url).digest("hex");
    }

    return hash;
  };

  return {
    download: download,
    setUrl: setUrl
  };
};

module.exports = FileController;