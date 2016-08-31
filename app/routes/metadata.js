"use strict";

const MetadataController = require("../controllers/metadata"),
  Metadata = require("../models/metadata");

const MetadataRoute = function(app, metadataDB){

  app.get("/metadata", (req, res, next) => {

    const fileUrl = req.query.url;

    if (fileUrl) {
      const metadata = new Metadata({}, metadataDB),
        controller = new MetadataController(fileUrl, metadata);

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
    res.status(404)
      .send({
        status: 404,
        message: "No metadata found"
      });

    console.info("No metadata found", fileUrl, new Date());
  }
};
module.exports = MetadataRoute;