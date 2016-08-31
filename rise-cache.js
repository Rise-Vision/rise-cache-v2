const config = require("./config/config");
const error = require("./app/middleware/error");
const server = require("./app/server")(config);
const pkg = require("./package.json");
const Database = require("./app/database");

const headerDB = new Database(config.headersDBPath);
const metadataDB = new Database(config.metadataDBPath);


server.init();
server.start();

require("./app/routes/ping")(server.app, pkg);
require("./app/routes/file")(server.app, headerDB.db, config.fileUpdateDuration);
require("./app/routes/metadata")(server.app, metadataDB.db);

server.app.use(error.handleError);