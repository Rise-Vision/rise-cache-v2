"use strict";

const DisplayRoute = function(app, displayId) {

  app.get("/displays", (req, res) => {
    const response = { displayId : displayId };

    res.json(response);
  });

};

module.exports = DisplayRoute;