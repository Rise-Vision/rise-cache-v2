"use strict";

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const Data = require("../models/data");
const DataController = require("../controllers/data");

const SpreadsheetsRoute = function(app, db) {
  const model = new Data({}, db);
  const controller = new DataController(model);

  app.get("/spreadsheets", (req, res, next) => {
    const key = req.query.key;

    if (!key) {
      res.statusCode = 400;

      return next(new Error("Missing key parameter"));
    }

    controller.on("data", (data) => {
      res.json(data);
    });

    controller.on("no-data", (data) => {
      res.json({});
    });

    controller.on("data-error", (err) => {
      console.error(err, key, new Date());
      // TODO: Return response.
    });

    controller.getData(key);
  });

  app.post("/spreadsheets", jsonParser, (req, res, next) => {
    if (!("key" in req.body) || !("value" in req.body)) {
      res.statusCode = 400;

      return next(new Error("Missing POST data"));
    }

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