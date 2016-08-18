"use strict";

const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  request = require("request"),
  config = require("../../config/config"),
  EventEmitter = require("events").EventEmitter,
  util = require("util");

const FileController = function(url) {
  EventEmitter.call(this);
  let fileName = config.downloadPath + path.sep;

  this.download = () => {
    let self = this;

    if (url) {
      fileName += getFileName(url);
      let file = fs.createWriteStream(fileName);

      file.on("finish", () => {
        file.close(() => {
          self.emit("downloaded");
        });
      }).on("error", (err) => {
        handleError(err, "file-error", self);
      });

      // Download the file.
      request.get(url)
        .on("response", (res) => {
          if (res.statusCode == 200) {
            res.pipe(file);
          } else {
            fs.unlink(fileName);
          }
          self.emit("stream", res);
        })
        .on("error", (err) => {
          handleError(err, "request-error", self);
        });
    }
  };

  const handleError = (err, type, self) => {
    fs.unlink(fileName);
    self.emit(type, err);
  };

  const getFileName = () => {
    let hash = "";

    if (url) {
      hash = crypto.createHash("md5").update(url).digest("hex");
    }

    return hash;
  };
};

util.inherits(FileController, EventEmitter);

module.exports = FileController;