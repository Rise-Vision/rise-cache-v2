"use strict";

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const Data = require("../models/data");
const DataController = require("../controllers/data");

const SpreadsheetsRoute = function(app, db) {

  app.post("/spreadsheets", jsonParser, (req, res, next) => {
    if (!("key" in req.body) || !("value" in req.body)) {
      res.statusCode = 400;

      return next(new Error("Missing POST data"));
    }

    const model = new Data({}, db);
    const controller = new DataController(model);

    controller.on("save-data", (data) => {
      res.status(201).json(data);
    });

    controller.on("save-data-error", (err) => {
      res.statusCode = 500;
      next(err);
    });

    controller.saveData(req.body.key, req.body.value);
  });

};

module.exports = SpreadsheetsRoute;