const config = require("./config/config");
const server = require("./app/server")(config);
const pkg = require("../../package.json");

server.start();

require("./app/controllers/ping")(server.app, pkg);
