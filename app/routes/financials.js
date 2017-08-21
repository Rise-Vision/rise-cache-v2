"use strict";

const FinancialsController = require("../controllers/financials");

const FinancialsRoute = function(app, riseDisplayNetworkII, logger) {

  app.get("/financials", (req, res, next) => {
    const financialUrl = req.query.url;

    if (financialUrl) {
      const controller = new FinancialsController(financialUrl, riseDisplayNetworkII, logger);

      controller.on("file-error", (err) => {
        res.statusCode = 500;
        next(err);
      });

      controller.on("invalid-response", (statusCode) => {
        sendInvalidResponse(res, financialUrl, statusCode);
      });

      controller.on("request-error", (err) => {
        logger.error(err, null, financialUrl);
        sendResponse(res, 504, "Financial server could not be reached");
      });

      controller.on("data", (data) => {
        res.status(200).send(data);
      });

      controller.on("saved", () => {
        logger.info("Financial data saved", financialUrl);
      });

      controller.getData();

    } else {
      res.statusCode = 400;
      next(new Error("Missing url parameter"));
    }
  });

  function sendInvalidResponse(res, url, statusCode) {
    logger.error("Invalid response with status code " + statusCode, null, url);

    sendResponse(res, 502, "File's host server returned an invalid response with status code: " + statusCode);
  }

  function sendResponse(res, statusCode, message) {
    if (!res.headersSent) {
      res.status(statusCode)
        .send({
          status: statusCode,
          message: message
        });
    }
  }

};

module.exports = FinancialsRoute;
