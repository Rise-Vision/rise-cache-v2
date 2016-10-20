"use strict";

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const Data = require("../models/data");
const DataController = require("../controllers/data");

const SpreadsheetsRoute = function(app, db, logger) {

  const model = new Data({}, db);
  const controller = new DataController(model);
  let _res = null;
  let _next = null;
  let _key = null;

  controller.on("save-data", (data) => {
    _res.location("/spreadsheets/" + _key);
    _res.status(201).json(data);
  });

  controller.on("save-data-error", (err) => {
    logger.error("Could not save spreadsheet data", _key);
    _res.statusCode = 500;
    _next(err);
  });

  controller.on("get-data", (data) => {
    if (data) {
      _res.status(200).json(data);
    } else  {
      _res.statusCode = 404;
      _next(new Error("Not found"));
    }
  });

  controller.on("get-data-error", (err) => {
    logger.error("Could not get spreadsheet data", _key);
    _res.statusCode = 500;
    _next(err);
  });

  controller.on("delete-data", (numRemoved) => {
    if (numRemoved > 0) {
      _res.status(204).json();
    } else {
      _res.statusCode = 404;
      _next(new Error("Not found"));
    }
  });

  controller.on("delete-data-error", (err) => {
    logger.error("Could not delete spreadsheet data", _key);
    _res.statusCode = 500;
    _next(err);
  });

  function isBodyValid(req) {
    if (!("key" in req.body) || !("value" in req.body)) {
      _res.statusCode = 400;
      _next(new Error("Missing POST data"));
      return false;
    }
    return true;
  }

  app.post("/spreadsheets", jsonParser, (req, res, next) => {

    _res = res;
    _next = next;
    if(!isBodyValid(req)) return;

    _key = req.body.key;

    controller.saveData(_key, req.body.value);
  });

  app.get("/spreadsheets/:key", (req, res, next) => {

    _res = res;
    _next = next;
    _key = req.params.key;

    controller.getData(_key);
  });

  app.delete("/spreadsheets/:key", (req, res, next) => {
    _res = res;
    _next = next;
    _key = req.params.key;

    controller.deleteData(_key);
  });

  app.put("/spreadsheets/:key", jsonParser, (req, res, next) => {

    _res = res;
    _next = next;
    if(!isBodyValid(req)) return;
    
    _key = req.params.key;

    controller.saveData(_key, req.body.value);
  });
};

module.exports = SpreadsheetsRoute;
