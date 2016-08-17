const PingRoute = function(app, pkg){

  app.get("/", (req, res) => {
    const response = { name : pkg.name, version: pkg.version };

    res.json(response);
  });
};
module.exports = PingRoute;