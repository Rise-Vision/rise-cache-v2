const config = require("./config/config");
const server = require("./app/server")(config);
const pkg = require("../../package.json");

server.start();

require("./app/routes/ping")(server.app, pkg);
