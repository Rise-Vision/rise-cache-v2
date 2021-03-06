"use strict";

const MetadataController = require("../controllers/metadata"),
  Data = require("../models/data"),
  urlParser = require("../helpers/url-parser");

const MetadataRoute = function(app, metadataDB, riseDisplayNetworkII, logger) {

  app.get("/metadata", (req, res, next) => {

    if (req.query.url) {

      const fileUrl = urlParser.parse(req.url);

      const metadata = new Data({}, metadataDB),
        controller = new MetadataController(fileUrl, metadata, riseDisplayNetworkII, logger);

      controller.on("response", (data) => {
        res.json(data);
      });

      controller.on("no-response", () => {
        sendNoResponse(res, fileUrl);
      });

      controller.getMetadata();

    } else {
      res.statusCode = 400;
      next(new Error("Missing url parameter"));
    }

  });

  function sendNoResponse(res, fileUrl) {
    res.status(502)
      .send({
        status: 502,
        message: "Could not get metadata from storage server"
      });

    console.info("Could not get metadata from storage server", fileUrl, new Date());
  }
};
module.exports = MetadataRoute;