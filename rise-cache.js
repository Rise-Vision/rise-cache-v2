const config = require("./config/config");
const cors = require("cors");
const error = require("./app/middleware/error");
const server = require("./app/server")(config);
const pkg = require("./package.json");
const Database = require("./app/database");
const PropertiesReader = require("properties-reader");

const riseDisplayNetworkII = PropertiesReader(config.riseDisplayNetworkIIPath);
const headerDB = new Database(config.headersDBPath);
const metadataDB = new Database(config.metadataDBPath);

server.app.use(cors());

server.init();
server.start();

require("./app/routes/ping")(server.app, pkg);
require("./app/routes/file")(server.app, headerDB.db, config.fileUpdateDuration, riseDisplayNetworkII);
require("./app/routes/metadata")(server.app, metadataDB.db, riseDisplayNetworkII);

server.app.use(error.handleError);