"use strict";

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const Data = require("../models/data");
const DataController = require("../controllers/data");

const FinancialRoute = function(app, db, logger) {

  const model = new Data({}, db);
  const controller = new DataController(model);
  let _res = null;
  let _next = null;
  let _key = null;

  function isBodyValid(req) {
    if (!("key" in req.body) || !("value" in req.body)) {
      _res.statusCode = 400;
      _next(new Error("Missing POST data"));
      return false;
    }
    return true;
  }

  controller.on("save-data", (data) => {
    _res.location("/financial/" + _key);
    _res.status(201).json(data);
  });

  controller.on("save-data-error", (err) => {
    logger.error("Could not save financial data", _key);
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
    logger.error("Could not get financial data", _key);
    _res.statusCode = 500;
    _next(err);
  });

  app.post("/financial", jsonParser, (req, res, next) => {

    _res = res;
    _next = next;
    if(!isBodyValid(req)) return;

    _key = req.body.key;

    controller.saveData(_key, req.body.value);
  });

  app.get("/financial/:key", (req, res, next) => {

    _res = res;
    _next = next;
    _key = req.params.key;

    controller.getData(_key);
  });

};

module.exports = FinancialRoute;