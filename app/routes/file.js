"use strict";

const file = require("../controllers/file")();

const FileRoute = function(app) {

  app.get("/files", (req, res, next) => {
    const url = req.query.url;

    if (url) {
      file.setUrl(url);

      // Download the file.
      file.download((err, statusCode) => {
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

};

module.exports = FileRoute;