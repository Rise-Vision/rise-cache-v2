const fs = require("fs");
const config = require("./config/config");
const fileSystem = require("./app/helpers/file-system");
const error = require("./app/middleware/error");
const server = require("./app/server")(config, fileSystem.createDir);
const pkg = require("./package.json");

server.init();
server.start();

require("./app/routes/ping")(server.app, pkg);
require("./app/routes/file")(server.app, fs);

server.app.use(error.handleError);