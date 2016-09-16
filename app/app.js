"use strict";

const config = require("../config/config"),
  cors = require("cors"),
  error = require("./middleware/error"),
  server = require("./server")(config),
  pkg = require("../package.json"),
  Database = require("./database"),
  PropertiesReader = require("properties-reader"),
  CleanupJob = require("./jobs/cleanup"),
  fileSystem = require("./helpers/file-system");


const AppFactory = function() {

  const start = function() {

    fileSystem.createDir(config.downloadPath);
    fileSystem.createDir(config.cachePath);

    const riseDisplayNetworkII = PropertiesReader(config.riseDisplayNetworkIIPath);
    const headerDB = new Database(config.headersDBPath);
    const metadataDB = new Database(config.metadataDBPath);
    const cleanupJob = new CleanupJob(config, headerDB.db, metadataDB.db);

    server.app.use(cors());

    cleanupJob.run();
    server.start();

    require("./routes/ping")(server.app, pkg);
    require("./routes/file")(server.app, headerDB.db, config.fileUpdateDuration, riseDisplayNetworkII);
    require("./routes/metadata")(server.app, metadataDB.db, riseDisplayNetworkII);

    server.app.use(error.handleError);

  };

  return {
    start: start
  };
};

module.exports = AppFactory;