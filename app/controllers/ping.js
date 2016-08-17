const PingController = function(app, pkg){

  app.get("/", (req, res, next) => {

    const response = { name : pkg.name, version: pkg.version };

    res.json(response);
  });
};

module.exports = PingController;