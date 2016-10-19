"use strict";

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const Data = require("../models/data");
const DataController = require("../controllers/data");

const SpreadsheetsRoute = function(app, db, logger) {

  const model = new Data({}, db);
  const controller = new DataController(model);

  app.post("/spreadsheets", jsonParser, (req, res, next) => {

    if (!("key" in req.body) || !("value" in req.body)) {
      res.statusCode = 400;

      return next(new Error("Missing POST data"));
    }

    let key = req.body.key;

    controller.on("save-data", (data) => {
      res.status(201).json(data);
    });

    controller.on("save-data-error", (err) => {
      logger.error("Could not save spreadsheet data", key);
      res.statusCode = 500;
      next(err);
    });

    controller.saveData(key, req.body.value);
  });

  app.get("/spreadsheets/:key", (req, res, next) => {

    let key = req.params.key;

    controller.on("get-data", (data) => {
      if (data) {
        res.status(200).json(data);
      } else  {
        res.statusCode = 404;
        next(new Error("Not found"));
      }
    });

    controller.on("get-data-error", (err) => {
      logger.error("Could not get spreadsheet data", key);
      res.statusCode = 500;
      next(err);
    });

    controller.getData(key);
  });

  app.delete("/spreadsheets/:key", (req, res, next) => {
    let key = req.params.key;

    controller.on("delete-data", (numRemoved) => {
      if (numRemoved > 0) {
        res.status(204).json();
      } else {
        res.statusCode = 404;
        next(new Error("Not found"));
      }

    });

    controller.on("delete-data-error", (err) => {
      logger.error("Could not delete spreadsheet data", key);
      res.statusCode = 500;
      next(err);
    });

    controller.deleteData(key);
  });

};

module.exports = SpreadsheetsRoute;