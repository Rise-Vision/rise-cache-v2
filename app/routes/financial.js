"use strict";

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const Data = require("../models/data");
const DataController = require("../controllers/data");

const FinancialRoute = function(app, db, logger) {

  const model = new Data({}, db);
  const controller = new DataController(model);

  function isBodyValid(req, res, next) {
    if (!("key" in req.body) || !("value" in req.body)) {
      res.statusCode = 400;
      next(new Error("Missing POST data"));
      return false;
    }
    return true;
  }

  controller.on( "delete-data", ( numRemoved, res, next ) => {
    if ( numRemoved > 0 ) {
      res.status( 204 ).json();
    } else {
      res.statusCode = 404;
      next( new Error( "Not found" ) );
    }
  } );

  controller.on( "delete-data-error", ( err, key, res, next ) => {
    logger.error( "Could not delete financial data", key );
    res.statusCode = 500;
    next( err );
  } );

  controller.on("save-data", (data, key, res) => {
    res.location("/financial/" + key);
    res.status(201).json(data);
  });

  controller.on("save-data-error", (err, key, res, next) => {
    logger.error("Could not save financial data", key);
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
    logger.error("Could not get financial data", key);
    res.statusCode = 500;
    next(err);
  });

  app.delete( "/financial/:key", ( req, res, next ) => {
    controller.deleteData( req.params.key, res, next );
  } );

  app.post("/financial", jsonParser, (req, res, next) => {
    if ( !isBodyValid( req, res, next ) ) {
      return;
    }

    controller.saveData( req.body.key, req.body.value, res, next );
  });

  app.get("/financial/:key", (req, res, next) => {
    controller.getData( req.params.key, res, next );
  });

  app.put( "/financial/:key", jsonParser, ( req, res, next ) => {
    if ( !( "value" in req.body ) ) {
      res.statusCode = 400;
      next( new Error( "Missing PUT data" ) );

      return;
    }

    controller.saveData( req.params.key, req.body.value, res, next );
  } );

};

module.exports = FinancialRoute;