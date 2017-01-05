"use strict";

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const Data = require("../models/data");
const DataController = require("../controllers/data");

const SpreadsheetsRoute = function(app, db, logger) {

  const model = new Data({}, db);
  const controller = new DataController(model);

  controller.on("save-data", (data, key, res) => {
    res.location("/spreadsheets/" + key);
    res.status(201).json(data);
  });

  controller.on("save-data-error", (err, key, res, next) => {
    logger.error("Could not save spreadsheet data", key);
    res.statusCode = 500;
    next(err);
  });

  controller.on("get-data", (data, res, next) => {
    if (data) {
      res.status(200).json(data);
    } else  {
      res.statusCode = 404;
      next(new Error("Not found"));
    }
  });

  controller.on("get-data-error", (err, key, res, next) => {
    logger.error("Could not get spreadsheet data", key);
    res.statusCode = 500;
    next(err);
  });

  controller.on("delete-data", (numRemoved, res, next) => {
    if (numRemoved > 0) {
      res.status(204).json();
    } else {
      res.statusCode = 404;
      next(new Error("Not found"));
    }
  });

  controller.on("delete-data-error", (err, key, res, next) => {
    logger.error("Could not delete spreadsheet data", key);
    res.statusCode = 500;
    next(err);
  });

  function isBodyValid(req, res, next) {
    if (!("key" in req.body) || !("value" in req.body)) {
      res.statusCode = 400;
      next(new Error("Missing POST data"));
      return false;
    }
    return true;
  }

  app.post("/spreadsheets", jsonParser, (req, res, next) => {
    if(!isBodyValid(req, res, next)) return;

    controller.saveData(req.body.key, req.body.value, res, next);
  });

  app.get("/spreadsheets/:key", (req, res, next) => {
    controller.getData(req.params.key, res, next);
  });

  app.delete("/spreadsheets/:key", (req, res, next) => {
    controller.deleteData(req.params.key, res, next);
  });

  app.put("/spreadsheets/:key", jsonParser, (req, res, next) => {
    if(!isBodyValid(req, res, next)) return;

    controller.saveData(req.params.key, req.body.value, res, next);
  });
};

module.exports = SpreadsheetsRoute;
